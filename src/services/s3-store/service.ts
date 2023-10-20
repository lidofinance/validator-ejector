import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3'

import { LoggerService } from 'lido-nanolib'
import type { MessageFile } from '../local-file-reader/service.js'

export type S3StoreService = ReturnType<typeof makeS3Store>

export const makeS3Store = ({ logger }: { logger: LoggerService }) => {
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
            await client.send(listCommand)

          if (!Contents) throw new Error('No contents in AWS S3 response.')

          for (const item of Contents) {
            if (!item.Key)
              throw new Error('Key not found in an AWS S3 object in bucket.')
            fileNames.push(item.Key)
          }

          if (IsTruncated) {
            isTruncated = IsTruncated
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
        logger.info(`${ix + 1}/${fileNames.length}`)

        const downloadCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: fileName,
        })

        try {
          const response = await client.send(downloadCommand)

          if (!response.Body) {
            throw new Error('No body for an object in AWS.')
          }

          const stringified = await response.Body.transformToString()

          files.push({ filename: fileName, content: stringified })
        } catch (e) {
          throw new Error('Unable to read file from AWS S3.', { cause: e })
        }
      }

      return files
    },
  }
}
