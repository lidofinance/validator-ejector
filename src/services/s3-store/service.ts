import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3'

export type S3StoreService = ReturnType<typeof makeS3Store>

export const makeS3Store = () => {
  const client = new S3Client({})

  return {
    async read(uri: string): Promise<string[]> {
      const paramReg = /^[sS]3:\/\/(?<Bucket>.+)/
      const uriParams = uri.match(paramReg)

      if (!uriParams || !uriParams.groups) {
        throw new Error('Not a valid AWS S3 bucket uri')
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

          if (!Contents) throw new Error('No contents in response')

          Contents.map((c) => c.Key!).forEach((c) => fileNames.push(c))

          if (!IsTruncated) throw new Error('No IsTruncated in response')

          isTruncated = IsTruncated

          listCommand.input.ContinuationToken = NextContinuationToken
        } while (isTruncated)
      } catch (e) {
        throw new Error('Unable to list bucket files from Google Storage.', {
          cause: e,
        })
      }

      const files: string[] = []

      for (const fileName of fileNames) {
        const downloadCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: fileName,
        })

        const response = await client.send(downloadCommand)

        if (!response.Body) {
          throw new Error('Unable to read file from Google Storage.')
        }

        const stringified = await response.Body.transformToString()

        files.push(stringified)
      }

      return files
    },
  }
}
