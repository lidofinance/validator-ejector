import { obj, str } from '../../lib/index.js'

export const versionDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      version: str(json.version),
    }),
    'Invalid or no version in package.json'
  )
