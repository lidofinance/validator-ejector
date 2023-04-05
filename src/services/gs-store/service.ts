import { Storage } from '@google-cloud/storage'

export type GsStoreService = ReturnType<typeof makeGsStore>

export const makeGsStore = () => {
  const storage = new Storage()
  const paramReg = /^gs:\/\/(?<Bucket>.+)\/(?<Key>.*)/
  return {
    async read(uri: string): Promise<string> {
      const uriParams = uri.match(paramReg)

      if (!uriParams || !uriParams.groups) {
        throw new Error('No valid gs uri')
      }

      let data = ''
      const readable = await storage
        .bucket(uriParams.groups.Bucket)
        .file(uriParams.groups.Key)
        .createReadStream()
      for await (const chunk of readable) {
        data += chunk
      }
      return data
    },
  }
}
