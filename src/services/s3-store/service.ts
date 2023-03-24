import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type S3StoreService = ReturnType<typeof makeS3Store>

export const makeS3Store = () => {
  const client = new S3Client({})
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
