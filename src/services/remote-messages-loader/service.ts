import { exitOrEthDoExitDTO } from '../../dto/messages.js'

import type { LoggerService } from 'lido-nanolib'
import type { ConfigService } from '../config/service.js'
import type { MetricsService } from '../prom/service.js'
import type { S3StoreService } from '../s3-store/service.js'
import type { GsStoreService } from '../gs-store/service.js'
import type { CryptoService } from '../crypto/service.js'
import { EthDoExitMessage, ExitMessage } from '../../interfaces/messages.js'

export type RemoteMessagesLoaderService = ReturnType<
  typeof makeRemoteMessagesLoader
>

export const makeRemoteMessagesLoader = ({
  logger,
  config,
  metrics,
  s3Service,
  gsService,
  crypto,
}: {
  logger: LoggerService
  config: ConfigService
  metrics: MetricsService
  s3Service: S3StoreService
  gsService: GsStoreService
  crypto: CryptoService
}) => {
  const load = async (): Promise<ExitMessage[]> => {
    // TODO: test in 3 variants of usage
    if (!config.REMOTE_MESSAGES_LOCATIONS) {
      logger.debug('Skipping loading messages in webhook mode')
      return []
    }

    const messages: ExitMessage[] = []

    const reads: string[] = []

    for (const file of config.REMOTE_MESSAGES_LOCATIONS) {
      try {
        const read = await readFile(file)
        reads.push(read.toString())
      } catch (error) {
        logger.warn(`Unparseable read file ${file}`, error)
        continue
      }
    }

    for (const read of reads) {
      let json: Record<string, unknown>
      try {
        json = JSON.parse(read)
      } catch (error) {
        logger.warn(`Unparseable JSON`, error)
        metrics.exitMessages.inc({
          valid: 'false',
        })
        continue
      }

      if ('crypto' in json) {
        try {
          json = await crypto.decryptMessage(json)
        } catch (e) {
          logger.warn(`Unable to decrypt`)
          metrics.exitMessages.inc({
            valid: 'false',
          })
          continue
        }
      }

      let validated: ExitMessage | EthDoExitMessage

      try {
        validated = exitOrEthDoExitDTO(json)
      } catch (e) {
        logger.error(`failed validation:`, e)
        metrics.exitMessages.inc({
          valid: 'false',
        })
        continue
      }

      const message = 'exit' in validated ? validated.exit : validated
      messages.push(message)
    }

    return messages
  }

  const readFile = async (uri: string): Promise<string> => {
    return uri.startsWith('s3://') ? s3Service.read(uri) : gsService.read(uri)
  }

  return { load }
}
