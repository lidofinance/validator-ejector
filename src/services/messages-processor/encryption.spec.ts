import { create, decrypt } from '@chainsafe/bls-keystore'
import { execFile } from 'node:child_process'
import {
  createCipheriv,
  createHash,
  pbkdf2,
  randomBytes,
  randomUUID,
} from 'node:crypto'
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { makeLogger } from '../../lib/index.js'
import { defaultConfig } from '../../test/config.js'
import { makeConfig } from '../config/service.js'
import { prepareDeps } from './test/prepare-deps.js'
import {
  CAPELLA_MESSAGE,
  EPOCH,
  VALIDATOR_INDEX,
  VALIDATOR_PUB_KEY,
} from './test/messages.js'

const password = randomBytes(32).toString('hex')
const original = JSON.stringify({
  ...JSON.parse(CAPELLA_MESSAGE.content),
  description: 'Synthetic exit payload: проверка UTF-8 🔐',
})
const payload = new TextEncoder().encode(original)
const fork = {
  previous_version: '0x03017000',
  current_version: '0x04017000',
  epoch: EPOCH,
}
const forkInfo = {
  isDencun: false,
  currentVersion: fork.current_version,
  capellaVersion: fork.current_version,
}
const flipByte = (hex: string) =>
  `${hex.startsWith('00') ? '01' : '00'}${hex.slice(2)}`
// These disposable fixtures exercise payload/error handling, not KDF cost.
// The CLI and independent Node.js ciphertext below use 262144 iterations.
const testKdf: NonNullable<Parameters<typeof create>[5]> = {
  function: 'pbkdf2',
  params: {
    dklen: 32,
    c: 32,
    prf: 'hmac-sha256',
    salt: '12'.repeat(32),
  },
}

describe('encrypted exit messages', () => {
  let store: Awaited<ReturnType<typeof create>>
  let malformedJsonStore: Awaited<ReturnType<typeof create>>

  beforeAll(async () => {
    store = await create(password, payload, new Uint8Array(), '', null, testKdf)
    malformedJsonStore = await create(
      password,
      new TextEncoder().encode(
        'This payload is longer than 32 bytes, but is not JSON.'
      ),
      new Uint8Array(),
      '',
      null,
      testKdf
    )
  })

  it('round-trips arbitrary UTF-8 payload bytes longer than a BLS key', async () => {
    expect(payload.length).toBeGreaterThan(32)
    expect(store.pubkey).toBe('')
    expect(store.path).toBe('')
    expect(await decrypt(store, password)).toEqual(payload)
  })

  it('decrypts independently encrypted bytes using a Unicode password file ending in LF', async () => {
    // Build the input independently of the keystore library. Its 3.0.0 password
    // normalization uses NFKD UTF-8 and preserves the trailing LF.
    const filePassword = `${randomBytes(32).toString('hex')} café\n`
    const salt = randomBytes(32)
    const iv = randomBytes(16)
    const derivedKey = await promisify(pbkdf2)(
      Buffer.from(filePassword.normalize('NFKD'), 'utf8'),
      salt,
      262144,
      32,
      'sha256'
    )
    const cipher = createCipheriv('aes-128-ctr', derivedKey.subarray(0, 16), iv)
    const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()])
    const keystore: Awaited<ReturnType<typeof create>> = {
      version: 4,
      uuid: randomUUID(),
      path: '',
      pubkey: '',
      crypto: {
        kdf: {
          function: 'pbkdf2',
          params: {
            dklen: 32,
            c: 262144,
            prf: 'hmac-sha256',
            salt: salt.toString('hex'),
          },
          message: '',
        },
        checksum: {
          function: 'sha256',
          params: {},
          message: createHash('sha256')
            .update(derivedKey.subarray(16, 32))
            .update(ciphertext)
            .digest('hex'),
        },
        cipher: {
          function: 'aes-128-ctr',
          params: { iv: iv.toString('hex') },
          message: ciphertext.toString('hex'),
        },
      },
    }
    expect(payload.length).toBeGreaterThan(32)
    const cwd = await mkdtemp(join(tmpdir(), 'ejector-password-file-'))
    try {
      const passwordFile = join(cwd, 'password.txt')
      await writeFile(passwordFile, filePassword)
      const logger = makeLogger({
        level: 'error',
        format: 'simple',
        sanitizer: { secrets: [], replacer: '<secret>' },
      })
      const config = makeConfig({
        logger,
        env: {
          ...defaultConfig,
          MESSAGES_PASSWORD_FILE: passwordFile,
        } as unknown as NodeJS.ProcessEnv,
      })
      expect(config.MESSAGES_PASSWORD).toBe(filePassword)
      expect(await decrypt(keystore, config.MESSAGES_PASSWORD!)).toEqual(
        payload
      )
      await expect(decrypt(keystore, filePassword.trimEnd())).rejects.toThrow()
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  }, 60_000)

  it('loads and verifies an exit decrypted by the real keystore library', async () => {
    const di = prepareDeps(
      [{ filename: 'encrypted.json', content: JSON.stringify(store) }],
      { pubKey: VALIDATOR_PUB_KEY, id: VALIDATOR_INDEX },
      fork,
      { messagesPassword: password }
    )
    try {
      const state = await di.messagesProcessor.loadToMemoryStorage(
        di.messageStorage,
        forkInfo
      )
      expect(state.added).toBe(1)
      expect(state.invalidExitMessageFiles.size).toBe(0)
      expect(di.messageStorage.findByValidatorIndex(VALIDATOR_INDEX)).toEqual(
        JSON.parse(CAPELLA_MESSAGE.content)
      )
    } finally {
      di.restore()
    }
  })

  it.each(['wrong password', 'ciphertext', 'checksum', 'decrypted JSON'])(
    'rejects invalid %s and still loads the next valid message',
    async (corruption) => {
      const badStore = structuredClone(
        corruption === 'decrypted JSON' ? malformedJsonStore : store
      )
      if (corruption === 'ciphertext') {
        badStore.crypto.cipher.message = flipByte(
          badStore.crypto.cipher.message
        )
      }
      if (corruption === 'checksum') {
        badStore.crypto.checksum.message = flipByte(
          badStore.crypto.checksum.message
        )
      }
      const suppliedPassword =
        corruption === 'wrong password' ? 'incorrect' : password
      if (corruption !== 'decrypted JSON') {
        await expect(decrypt(badStore, suppliedPassword)).rejects.toThrow()
      }
      const di = prepareDeps(
        [
          { filename: 'bad-encrypted.json', content: JSON.stringify(badStore) },
          CAPELLA_MESSAGE,
        ],
        { pubKey: VALIDATOR_PUB_KEY, id: VALIDATOR_INDEX },
        fork,
        { messagesPassword: suppliedPassword }
      )
      try {
        const state = await di.messagesProcessor.loadToMemoryStorage(
          di.messageStorage,
          forkInfo
        )
        expect(state.added).toBe(1)
        expect([...state.invalidExitMessageFiles]).toEqual([
          'bad-encrypted.json',
        ])
        expect(di.messageStorage.findByValidatorIndex(VALIDATOR_INDEX)).toEqual(
          JSON.parse(CAPELLA_MESSAGE.content)
        )
      } finally {
        di.restore()
      }
    }
  )

  it('runs the encrypt CLI with tsx in an isolated directory', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'ejector-encrypt-'))
    const input = join(cwd, 'encryptor/input')
    const output = join(cwd, 'encryptor/output')
    try {
      await mkdir(input, { recursive: true })
      await mkdir(output, { recursive: true })
      await writeFile(join(input, 'exit.json'), original)
      await writeFile(join(input, 'ignored.txt'), 'not a JSON input')
      await writeFile(join(output, 'sentinel.txt'), 'keep existing output')

      await promisify(execFile)(
        process.execPath,
        [
          createRequire(import.meta.url).resolve('tsx/cli'),
          fileURLToPath(
            new URL('../../../encryptor/encrypt.ts', import.meta.url)
          ),
        ],
        {
          cwd,
          env: {
            PATH: dirname(process.execPath),
            MESSAGES_PASSWORD: password,
            NODE_ENV: 'test',
          },
          timeout: 30_000,
        }
      )

      const encrypted = JSON.parse(
        await readFile(join(output, 'exit.json'), 'utf8')
      )
      expect(encrypted.crypto.kdf.function).toBe('pbkdf2')
      expect(encrypted.crypto.kdf.params.c).toBe(262144)
      expect(await decrypt(encrypted, password)).toEqual(payload)
      await expect(decrypt(encrypted, 'incorrect')).rejects.toThrow()
      encrypted.crypto.checksum.message = flipByte(
        encrypted.crypto.checksum.message
      )
      await expect(decrypt(encrypted, password)).rejects.toThrow()
      expect((await readdir(output)).sort()).toEqual([
        'exit.json',
        'sentinel.txt',
      ])
      expect(await readFile(join(output, 'sentinel.txt'), 'utf8')).toBe(
        'keep existing output'
      )
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  }, 60_000)
})
