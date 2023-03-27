import { obj, str } from 'lido-nanolib'

export const versionDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      version: str(json.version),
    }),
    'Invalid or no version in package.json'
  )
