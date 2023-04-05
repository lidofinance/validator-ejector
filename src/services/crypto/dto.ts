import { obj, str, num, optional, literal_str } from 'lido-nanolib'

export const encryptedMessageDTO = (input: unknown) =>
  obj(input, (json) => ({
    version: num(json.version),
    uuid: str(json.uuid),
    description: optional(() => str(json.description)),
    path: str(json.path),
    pubkey: str(json.pubkey),
    crypto: obj(json.crypto, (crypto) => ({
      kdf: obj(crypto.kdf, (kdf) => ({
        function: literal_str('pbkdf2' as const, kdf.function),
        params: obj(kdf.params, (params) => ({
          dklen: num(params.dklen),
          c: num(params.c),
          prf: literal_str('hmac-sha256' as const, params.prf),
          salt: str(params.salt),
        })),
        message: literal_str('' as const, kdf.message),
      })),
      checksum: obj(crypto.checksum, (checksum) => ({
        function: literal_str('sha256' as const, checksum.function),
        params: obj(checksum.params, () => ({})),
        message: str(checksum.message),
      })),
      cipher: obj(crypto.cipher, (cipher) => ({
        function: literal_str('aes-128-ctr' as const, cipher.function),
        params: obj(cipher.params, (params) => ({ iv: str(params.iv) })),
        message: str(cipher.message),
      })),
    })),
  }))
