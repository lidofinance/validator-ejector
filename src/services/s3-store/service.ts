import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3'

import { LoggerService } from '../../lib/index.js'
import type { MessageFile } from '../local-file-reader/service.js'
import type { MetricsService } from '../prom/service.js'

export type S3StoreService = ReturnType<typeof makeS3Store>

export const makeS3Store = ({
  logger,
  metrics,
}: {
  logger: LoggerService
  metrics: Pick<MetricsService, 'timeStorageRequest'>
}) => {
  let client: S3Client
  try {
    client = new S3Client({})
  } catch (e) {
    throw new Error(
      'Unable to initialise AWS S3 client. Please check credentials availability.',
      { cause: e }
    )
  }

  return {
    async read(uri: string): Promise<MessageFile[]> {
      const paramReg = /^[sS]3:\/\/(?<Bucket>.+)/
      const uriParams = uri.match(paramReg)

      if (!uriParams || !uriParams.groups) {
        throw new Error('Not a valid AWS S3 bucket uri.')
      }

      const bucketName = uriParams.groups.Bucket

      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
      })

      const fileNames: string[] = []

      try {
        let isTruncated = false

        do {
          const { Contents, IsTruncated, NextContinuationToken } =
            await metrics.timeStorageRequest(
              { source: 's3', operation: 'list' },
              () => client.send(listCommand)
            )

          if (!Contents) throw new Error('No contents in AWS S3 response.')

          for (const item of Contents) {
            if (!item.Key)
              throw new Error('Key not found in an AWS S3 object in bucket.')
            fileNames.push(item.Key)
          }

          // The flag follows every page: the last page of a truncated
          // listing sets it back to false and ends the loop
          isTruncated = Boolean(IsTruncated)
          if (isTruncated) {
            listCommand.input.ContinuationToken = NextContinuationToken
          }
        } while (isTruncated)
      } catch (e) {
        throw new Error('Unable to list bucket files from AWS S3.', {
          cause: e,
        })
      }

      const files: MessageFile[] = []

      for (const [ix, fileName] of fileNames.entries()) {
        logger.debug(`${ix + 1}/${fileNames.length}`)

        const downloadCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: fileName,
        })

        try {
          const stringified = await metrics.timeStorageRequest(
            { source: 's3', operation: 'get' },
            async () => {
              const response = await client.send(downloadCommand)

              if (!response.Body) {
                throw new Error('No body for an object in AWS.')
              }

              return response.Body.transformToString()
            }
          )

          files.push({ filename: fileName, content: stringified })
        } catch (e) {
          throw new Error('Unable to read file from AWS S3.', { cause: e })
        }
      }

      return files
    },
  }
}
