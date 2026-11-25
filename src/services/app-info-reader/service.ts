import { LocalFileReaderService } from 'services/local-file-reader/service.js'

import { buildInfoDTO, versionDTO } from './dto.js'

export type AppInfoReaderService = ReturnType<typeof makeAppInfoReader>

export const makeAppInfoReader = ({
  localFileReader,
}: {
  localFileReader: LocalFileReaderService
}) => {
  const readJson = async (fileName: string): Promise<unknown> => {
    let data: string

    try {
      data = (await localFileReader.readFile(fileName)).toString()
    } catch {
      throw new Error(`Unable to read ${fileName} file`)
    }

    try {
      return JSON.parse(data)
    } catch {
      throw new Error(`Unable to parse JSON in ${fileName}`)
    }
  }

  return {
    getVersion: async () => versionDTO(await readJson('package.json')).version,
    // The image build writes branch and commit into build-info.json
    getBuildInfo: async () => buildInfoDTO(await readJson('build-info.json')),
  }
}
