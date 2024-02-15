import type { LoggerService } from 'lido-nanolib'
import type { ConfigService } from '../config/service.js'
import type { MessageStorage } from '../job-processor/message-storage.js'
import type { MessagesProcessorService } from '../messages-processor/service.js'
import type { ForkVersionResolverService } from '../fork-version-resolver/service.js'

export type MessageReloader = ReturnType<typeof makeMessageReloader>

export const makeMessageReloader = ({
  logger,
  config,
  messagesProcessor,
  forkVersionResolver,
}: {
  logger: LoggerService
  config: ConfigService
  messagesProcessor: MessagesProcessorService
  forkVersionResolver: ForkVersionResolverService
}) => {
  /**
   * Appends new messages to messageStorage,
   * Not modifying the messagesStorage reference
   *
   * Notes:
   *   - new messages are identified by difference of signature
   */
  const reloadAndVerifyMessages = async (messagesStorage: MessageStorage) => {
    if (!config.MESSAGES_LOCATION) {
      logger.debug('Skipping loading messages in webhook mode')
      return
    }

    logger.info(`Presigned messages loading`, {
      existing: messagesStorage.size,
    })

    const forkInfo = await forkVersionResolver.getForkVersionInfo()

    const newMessagesStats = await messagesProcessor.loadToMemoryStorage(
      messagesStorage,
      forkInfo
    )

    const validatorIndexes = messagesStorage.messages.map(
      ({ message }) => message.validator_index
    )

    logger.debug('Uploaded Validators indexes', validatorIndexes)

    if (forkInfo.isDencun && newMessagesStats.invalidExitMessageFiles.size) {
      logger.warn('Invalid messages found')
      logger.warn(
        'If you see this error, you may have messages with the wrong version of fork'
      )
      logger.warn(
        'Check that the messages in these files use CAPELLA_FORK_VERSION',
        Array.from(newMessagesStats.invalidExitMessageFiles)
      )
    }

    logger.info(`Presigned messages updated`, {
      added: newMessagesStats.added,
      updated: newMessagesStats.updated,
      removed_outdated: newMessagesStats.removed,
      total: messagesStorage.size,
    })
  }

  return { reloadAndVerifyMessages }
}
