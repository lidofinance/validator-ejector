import 'dotenv/config'
import { readdir, readFile, writeFile } from 'fs/promises'
import { create } from '@chainsafe/bls-keystore'

const FOLDER = 'encryptor' // change if you move the script or run it directly
const PASSWORD = process.env.MESSAGES_PASSWORD

if (!PASSWORD) {
  console.error('Please set encryption password in .env')
  process.exit()
}

const toBytes = (secret) =>
  Uint8Array.from(Array.from(secret).map((letter) => letter.charCodeAt(0)))

for (const file of await readdir(`${FOLDER}/input`)) {
  const original = (await readFile(`${FOLDER}/input/${file}`)).toString()

  const message = toBytes(original)
  const pubkey = new Uint8Array()
  const path = ''

  const store = await create(PASSWORD, message, pubkey, path)

  await writeFile(`${FOLDER}/output/${file}.json`, JSON.stringify(store))
}
