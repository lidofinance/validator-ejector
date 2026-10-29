import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { access, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { PublicKey, Signature, verify } from '@chainsafe/blst'
import { create, decrypt } from '@chainsafe/bls-keystore'
import { ssz } from '@lodestar/types'
import jwt from 'jsonwebtoken'
import {
  computeExitDomain,
  computeExitSigningRoot,
  decodeFixedHex,
  verifyExitSignature,
} from '../dist/src/services/messages-processor/crypto.js'

assert.equal(process.versions.node, '24.22.1')
assert.equal(process.platform, 'linux')
assert.equal(
  process.getuid(),
  1000,
  'The runtime must use the non-root node user'
)

const require = createRequire(import.meta.url)
for (const name of [
  'hardhat',
  '@nomicfoundation/edr',
  'typescript',
  'vitest',
  'vite',
  'eslint',
  'tsx',
  'nock',
]) {
  assert.throws(
    () => require.resolve(name),
    { code: 'MODULE_NOT_FOUND' },
    `${name} must not be installed in the production image`
  )
}

async function checkBuildDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert.ok(
      !/\.(?:e2e-)?spec\./.test(entry.name) && !/^fixtures\./.test(entry.name),
      `Test output found in production: ${entry.name}`
    )
    if (entry.isDirectory()) {
      assert.ok(!['test', 'tests', 'fixtures'].includes(entry.name))
      await checkBuildDirectory(new URL(`${entry.name}/`, directory))
    }
  }
}
await checkBuildDirectory(new URL('../dist/', import.meta.url))
await access(new URL('../dist/src/index.js', import.meta.url))
await access(new URL('../dist/encryptor/encrypt.js', import.meta.url))
await access(new URL('../package.json', import.meta.url))

// Public synthetic validator fixture. No private key is needed for verification.
const publicKeyHex =
  '970d7295d60f14c76937487dd14e4b792fdf1e2e3510ba8b0531a5ec2a4ccf6ab4f9b352d2a71f2861b509dddaeaa271'
const signatureHex =
  'a7e459f559b16c4a6fa9184612a09dfcb8fed6b605c5e7228c66d73ac0cea80524a4e516592759596518d5c4873e9aef00d1a961b111233b38aa5455459a6b82882605df9f5a3e1429aa9c542204a7cf5c18c7935d98cbf534afc42e5c6c8617'
const goldenObjectRoot =
  '60670a9a49edf36e91fd7906cb17ae86b18b13d1444af9702ecf819d25823479'
const goldenDomain =
  '0400000017e2dad36f1d3595152042a9ad23430197557e2e7e82bc7f7fc72972'
const goldenSigningRoot =
  '7911d422c83e58603beafc3856340aaac838f5f89fa370b78062e926161dccb0'
const exit = { epoch: 28624, validatorIndex: 828943 }
const hex = (bytes) => Buffer.from(bytes).toString('hex')
assert.equal(hex(ssz.phase0.VoluntaryExit.hashTreeRoot(exit)), goldenObjectRoot)
const domain = computeExitDomain(
  decodeFixedHex('04017000', 4),
  decodeFixedHex(
    '9143aa7c615a7f7115e2b6aac319c03529df8242ae705fba9df39b79c59fa8b1',
    32
  )
)
assert.equal(hex(domain), goldenDomain)
const signingRoot = computeExitSigningRoot(exit, domain)
assert.equal(hex(signingRoot), goldenSigningRoot)
const publicKey = PublicKey.fromBytes(Buffer.from(publicKeyHex, 'hex'), true)
const signature = Signature.fromBytes(
  Buffer.from(signatureHex, 'hex'),
  true,
  true
)
assert.equal(verify(signingRoot, publicKey, signature, true, true), true)
assert.equal(verifyExitSignature(signingRoot, publicKeyHex, signatureHex), true)
const changedRoot = Uint8Array.from(signingRoot)
changedRoot[0] ^= 1
assert.equal(verify(changedRoot, publicKey, signature, true, true), false)
assert.equal(
  verifyExitSignature(changedRoot, publicKeyHex, signatureHex),
  false
)
assert.equal(
  verifyExitSignature(signingRoot, publicKeyHex, 'c0' + '00'.repeat(95)),
  false
)

const payload = new TextEncoder().encode('synthetic runtime encryption probe')
const password = randomBytes(32).toString('hex')
// A small KDF cost is used only for this public, synthetic smoke-test payload.
const keystore = await create(password, payload, new Uint8Array(), '', null, {
  function: 'pbkdf2',
  params: { dklen: 32, c: 32, prf: 'hmac-sha256', salt: '12'.repeat(32) },
})
assert.deepEqual(await decrypt(keystore, password), payload)
await assert.rejects(decrypt(keystore, 'wrong-public-test-password'))
const damaged = structuredClone(keystore)
damaged.crypto.checksum.message = '00'.repeat(32)
await assert.rejects(decrypt(damaged, password))

const testJwtSecret = Buffer.alloc(32, 1)
const token = jwt.sign({ probe: true }, testJwtSecret, { algorithm: 'HS256' })
assert.equal(
  jwt.verify(token, testJwtSecret, { algorithms: ['HS256'] }).probe,
  true
)

// Import the built dependency graph without starting jobs, clients, or listeners.
const { makeAppModule } = await import('../dist/src/app/module.js')
assert.equal(typeof makeAppModule, 'function')

console.log(
  JSON.stringify({
    node: process.versions.node,
    platform: process.platform,
    architecture: process.arch,
    uid: process.getuid(),
    nativeBlst: true,
    ssz: true,
    keystore: true,
    jwt: true,
    builtImports: true,
    productionOnly: true,
  })
)
