import type { ConfigService } from 'services/config/service'

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type S3StoreService = ReturnType<typeof makeS3Store>

export const makeS3Store = ({
  config: { S3_REGION, S3_SECRET_ACCESS_KEY, S3_ACCESS_KEY_ID },
}: {
  config: ConfigService
}) => {
  const client = new S3Client({
    region: S3_REGION,
    credentials: {
      secretAccessKey: S3_SECRET_ACCESS_KEY,
      accessKeyId: S3_ACCESS_KEY_ID
    }
  })
  const paramReg = /^[sS]3:\/\/(?<Bucket>.+)\/(?<Key>.*)/
  return {
    async read(uri: string): Promise<string> {
      const uriParams = uri.match(paramReg)

      if (!uriParams || !uriParams.groups) {
        throw new Error('No valid s3 uri')
      }
  
      const command = new GetObjectCommand({
        Bucket: uriParams.groups.Bucket,
        Key: uriParams.groups.Key
      });
    
      const response = await client.send(command);
      if (!response.Body) {
        throw new Error('Unable to read file from s3 storage')
      }
      return response.Body.transformToString();
    },
  }
}
