import { Storage } from '@google-cloud/storage'

export type GsStoreService = ReturnType<typeof makeGsStore>

export const makeGsStore = () => {
  const storage = new Storage()

  return {
    async read(uri: string): Promise<string[]> {
      const paramReg = /^gs:\/\/(?<Bucket>.+)/
      const uriParams = uri.match(paramReg)

      if (!uriParams || !uriParams.groups) {
        throw new Error('Not a valid Google Storage bucket uri.')
      }

      const bucketName = uriParams.groups.Bucket
      const bucket = storage.bucket(bucketName)

      const [filesResponse] = await bucket.getFiles()
      const fileNames = filesResponse.map((item) => item.name)

      const files: string[] = []

      for (const fileName of fileNames) {
        try {
          const file = await bucket.file(fileName).download()
          files.push(file.toString())
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
