import { obj, str } from '../../lib/index.js'

export const versionDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      version: str(json.version),
    }),
    'Invalid or no version in package.json'
  )

export const buildInfoDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      branch: str(json.branch),
      commit: str(json.commit),
    }),
    'Invalid or no branch and commit in build-info.json'
  )
