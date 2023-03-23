import type { ConfigService } from 'services/config/service'

import {Storage} from '@google-cloud/storage';

export type GsStoreService = ReturnType<typeof makeGsStore>

export const makeGsStore = ({
  config: { GS_CREDENTIAL_FILE, GS_PROJECT_ID },
}: {
  config: ConfigService
}) => {
  const storage = new Storage({
    keyFilename: GS_CREDENTIAL_FILE,
    projectId: GS_PROJECT_ID,
  });
  const paramReg = /^gs:\/\/(?<Bucket>.+)\/(?<Key>.*)/
  return {
    async read(uri: string): Promise<string> {
      const uriParams = uri.match(paramReg)

      if (!uriParams || !uriParams.groups) {
        throw new Error('No valid gs uri')
      }
  
      let data = '';
      const readable = await storage
        .bucket(uriParams.groups.Bucket)
        .file(uriParams.groups.Key)
        .createReadStream()
      for await (const chunk of readable) {
        data += chunk;
      }
      return data
    },
  }
}
