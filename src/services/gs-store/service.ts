import {
  Storage,
  File,
  GetFilesOptions,
  GetFilesResponse,
} from '@google-cloud/storage'

import { LoggerService } from '../../lib/index.js'
import type { MessageFile } from '../local-file-reader/service.js'
import type { MetricsService } from '../prom/service.js'

export type GsStoreService = ReturnType<typeof makeGsStore>

export const makeGsStore = ({
  logger,
  metrics,
}: {
  logger: LoggerService
  metrics: Pick<MetricsService, 'timeStorageRequest'>
}) => {
  let storage: Storage
  try {
    storage = new Storage()
  } catch (e) {
    throw new Error(
      'Unable to initialise Google Storage client. Please check credentials availability.',
      { cause: e }
    )
  }

  return {
    async read(uri: string): Promise<MessageFile[]> {
      const paramReg = /^gs:\/\/(?<Bucket>.+)/
      const uriParams = uri.match(paramReg)

      if (!uriParams || !uriParams.groups) {
        throw new Error('Not a valid Google Storage bucket uri.')
      }

      const bucketName = uriParams.groups.Bucket
      const bucket = storage.bucket(bucketName)

      // One page per request, so the metric counts every listing request
      const filesResponse: File[] = []
      try {
        let query: GetFilesOptions | null = { autoPaginate: false }
        while (query) {
          const page = query
          const [files, nextQuery] =
            await metrics.timeStorageRequest<GetFilesResponse>(
              { source: 'gs', operation: 'list' },
              () => bucket.getFiles(page)
            )
          filesResponse.push(...files)
          // The SDK gives null without a next page; its type says otherwise
          query = nextQuery ? { ...page, ...nextQuery } : null
        }
      } catch (e) {
        throw new Error('Unable to list bucket files from Google Storage.', {
          cause: e,
        })
      }

      const fileNames = filesResponse.map((item) => item.name)

      const files: MessageFile[] = []

      for (const [ix, fileName] of fileNames.entries()) {
        logger.debug(`${ix + 1}/${fileNames.length}`)

        try {
          const file = await metrics.timeStorageRequest(
            { source: 'gs', operation: 'get' },
            () => bucket.file(fileName).download()
          )
          files.push({ filename: fileName, content: file.toString() })
        } catch (e) {
          throw new Error('Unable to read file from Google Storage.', {
            cause: e,
          })
        }
      }

      return files
    },
  }
}
