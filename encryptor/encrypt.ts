import 'dotenv/config'
import { readdir, readFile, writeFile } from 'fs/promises'
import { create } from '@chainsafe/bls-keystore'
import { utils } from 'ethers'

const FOLDER = 'encryptor' // change if you move the script or run it directly
const PASSWORD = process.env.MESSAGES_PASSWORD ?? 
  (process.env.MESSAGES_PASSWORD_FILE && (await readFile(process.env.MESSAGES_PASSWORD_FILE)).toString())

if (!PASSWORD) {
  console.error('Please set encryption password in .env')
  process.exit()
}

for (const file of await readdir(`${FOLDER}/input`)) {
  if (!file.endsWith('.json')) {
    continue
  }

  const original = (await readFile(`${FOLDER}/input/${file}`)).toString()

  const message = utils.toUtf8Bytes(original)
  const pubkey = new Uint8Array()
  const path = ''

  const store = await create(PASSWORD, message, pubkey, path)

  await writeFile(`${FOLDER}/output/${file}`, JSON.stringify(store))
}
