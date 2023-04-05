import { exitOrEthDoExitDTO } from '../../dto/messages.js'

import type { LoggerService } from 'lido-nanolib'
import type { ReaderService } from '../reader/service.js'
import type { ConfigService } from '../config/service.js'
import type { MetricsService } from '../prom/service.js'
import type { CryptoService } from '../crypto/service.js'
import type {
  EthDoExitMessage,
  ExitMessage,
} from '../../interfaces/messages.js'

export type LocalMessagesLoaderService = ReturnType<
  typeof makeLocalMessagesLoader
>

export const makeLocalMessagesLoader = ({
  logger,
  config,
  reader,
  metrics,
  crypto,
}: {
  logger: LoggerService
  config: ConfigService
  reader: ReaderService
  metrics: MetricsService
  crypto: CryptoService
}) => {
  const load = async (): Promise<ExitMessage[]> => {
    if (!config.MESSAGES_LOCATION) {
      logger.debug('Skipping loading messages in webhook mode')
      return []
    }

    logger.info(`Loading messages from ${config.MESSAGES_LOCATION}`)

    if (!(await reader.dirExists(config.MESSAGES_LOCATION))) {
      logger.error('Messages directory is not accessible, exiting...')
      process.exit()
    }

    const folder = await reader.dir(config.MESSAGES_LOCATION)
    const messages: ExitMessage[] = []

    for (const file of folder) {
      if (!file.endsWith('.json')) {
        logger.warn(
          `File with invalid extension found in messages folder: ${file}`
        )
        continue
      }
      const read = await reader.file(`${config.MESSAGES_LOCATION}/${file}`)

      let json: Record<string, unknown>
      try {
        json = JSON.parse(read.toString())
      } catch (error) {
        logger.warn(`Unparseable JSON in file ${file}`, error)
        metrics.exitMessages.inc({
          valid: 'false',
        })
        continue
      }

      if ('crypto' in json) {
        try {
          json = await crypto.decryptMessage(json)
        } catch (e) {
          logger.warn(`Unable to decrypt encrypted file: ${file}`)
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
        logger.error(`${file} failed validation:`, e)
        metrics.exitMessages.inc({
          valid: 'false',
        })
        continue
      }

      const message = 'exit' in validated ? validated.exit : validated
      messages.push(message)
    }

    logger.info(`Loaded ${messages.length} messages`)

    return messages
  }

  return { load }
}
