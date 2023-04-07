import { Storage, File } from '@google-cloud/storage'

export type GsStoreService = ReturnType<typeof makeGsStore>

export const makeGsStore = () => {
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
    async read(uri: string): Promise<string[]> {
      const paramReg = /^gs:\/\/(?<Bucket>.+)/
      const uriParams = uri.match(paramReg)

      if (!uriParams || !uriParams.groups) {
        throw new Error('Not a valid Google Storage bucket uri.')
      }

      const bucketName = uriParams.groups.Bucket
      const bucket = storage.bucket(bucketName)

      let filesResponse: File[]
      try {
        filesResponse = (await bucket.getFiles())[0]
      } catch (e) {
        throw new Error('Unable to list bucket files from Google Storage.', {
          cause: e,
        })
      }

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
