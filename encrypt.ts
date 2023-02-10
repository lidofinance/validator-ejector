import { readFile, writeFile } from 'fs/promises'
import { create } from '@chainsafe/bls-keystore'

const PASSWORD = 'SECRET'

const toBytes = (secret: string) =>
  Uint8Array.from(Array.from(secret).map((letter) => letter.charCodeAt(0)))

const original = (await readFile('original.json')).toString()

const secret = toBytes(original)
const pubkey = new Uint8Array()
const path = ''

const store = await create(PASSWORD, secret, pubkey, path)

await writeFile('encrypted.json', JSON.stringify(store))
