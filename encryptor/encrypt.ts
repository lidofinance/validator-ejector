import 'dotenv/config'
import { readdir, readFile, writeFile } from 'fs/promises'
import { create } from '@chainsafe/bls-keystore'
import { utils } from 'ethers'

const FOLDER = 'encryptor' // change if you move the script or run it directly
const PASSWORD =
  process.env.MESSAGES_PASSWORD ??
  (process.env.MESSAGES_PASSWORD_FILE &&
    (await readFile(process.env.MESSAGES_PASSWORD_FILE)).toString())

if (!PASSWORD) {
  console.error('Please set encryption password in .env')
  process.exit()
}

const files = await readdir(`${FOLDER}/input`)

for (const [ix, file] of files.entries()) {
  console.info(`${ix + 1}/${files.length}`)

  if (!file.endsWith('.json')) {
    console.info('Ignoring', file)
    continue
  }

  const original = (await readFile(`${FOLDER}/input/${file}`)).toString()

  const message = utils.toUtf8Bytes(original)
  const pubkey = new Uint8Array()
  const path = ''

  const store = await create(PASSWORD, message, pubkey, path)

  await writeFile(`${FOLDER}/output/${file}`, JSON.stringify(store))
}
