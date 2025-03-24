import {
  obj,
  str,
  or,
  wrap,
  num,
  optional,
  literal_str,
} from '../../lib/index.js'

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

export const exitMessageDTO = (input: unknown) =>
  obj(input, (json) => ({
    message: obj(json.message, (message) => ({
      epoch: str(message.epoch),
      validator_index: str(message.validator_index),
    })),
    signature: str(json.signature),
  }))

export const ethDoExitMessageDTO = (input: unknown) =>
  obj(input, (json) => ({
    exit: exitMessageDTO(json.exit),
    fork_version: str(json.fork_version),
  }))

export const exitOrEthDoExitDTO = (input: unknown) =>
  wrap(input, () =>
    or(
      () => exitMessageDTO(input),
      () => ethDoExitMessageDTO(input)
    )
  )
