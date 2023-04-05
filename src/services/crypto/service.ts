import { decrypt } from '@chainsafe/bls-keystore'

import { encryptedMessageDTO } from './dto.js'
import type { ConfigService } from '../config/service.js'

export type CryptoService = ReturnType<typeof makeCryptoService>

export const makeCryptoService = ({ config }: { config: ConfigService }) => {
  const decryptMessage = async (input: Record<string, unknown>) => {
    if (!config.MESSAGES_PASSWORD) {
      throw new Error('Password was not supplied')
    }

    const checked = encryptedMessageDTO(input)

    const content = await decrypt(checked, config.MESSAGES_PASSWORD)

    const stringed = new TextDecoder().decode(content)

    let json: Record<string, unknown>
    try {
      json = JSON.parse(stringed)
    } catch {
      throw new Error('Unparseable JSON after decryption')
    }

    return json
  }

  return { decryptMessage }
}
