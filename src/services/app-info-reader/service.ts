import { LocalFileReaderService } from 'services/local-file-reader/service.js'

import { versionDTO } from './dto.js'

export type AppInfoReaderService = ReturnType<typeof makeAppInfoReader>

export const makeAppInfoReader = ({
  localFileReader,
}: {
  localFileReader: LocalFileReaderService
}) => ({
  getVersion: async () => {
    let data: string
    let parsed: unknown

    try {
      data = (await localFileReader.readFile('package.json')).toString()
    } catch {
      throw new Error('Unable to read package.json file')
    }

    try {
      parsed = JSON.parse(data)
    } catch {
      throw new Error('Unable to parse JSON in package.json')
    }

    const verified = versionDTO(parsed)

    return verified.version
  },
})
