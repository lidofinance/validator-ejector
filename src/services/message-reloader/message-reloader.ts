import type { LoggerService } from 'lido-nanolib'
import type { ConfigService } from '../config/service.js'
import type { MessageStorage } from '../job-processor/message-storage.js'
import type { MessagesProcessorService } from '../messages-processor/service.js'

export type MessageReloader = ReturnType<typeof makeMessageReloader>

export const makeMessageReloader = ({
  logger,
  config,
  messagesProcessor,
}: {
  logger: LoggerService
  config: ConfigService
  messagesProcessor: MessagesProcessorService
}) => {
  let alreadyReloadingMessages = false

  /**
   * Appends new messages to messageStorage,
   * Not modifying the messagesStorage reference
   *
   * Notes:
   *   - new messages are identified by difference of signature
   */
  const reloadAndVerifyMessages = async (messagesStorage: MessageStorage) => {
    logger.info(`Presigned messages loading`, {
      existing: messagesStorage.size,
    })
    const newMessagesStats = await messagesProcessor.loadToMemoryStorage(
      messagesStorage
    )

    logger.info(`Presigned messages updated`, {
      added: newMessagesStats.added,
      updated: newMessagesStats.updated,
      total: messagesStorage.size,
    })
  }

  const handleJob = async ({
    messageStorage,
  }: {
    messageStorage: MessageStorage
  }) => {
    // this should never happen, but just in case
    if (!config.MESSAGES_LOCATION) {
      // webhook mode
      return
    }

    if (alreadyReloadingMessages) {
      return
    }
    alreadyReloadingMessages = true
    logger.info('Presigned messages reload job started', {
      operatorId: config.OPERATOR_ID,
      stakingModuleId: config.STAKING_MODULE_ID,
      loadedMessages: messageStorage.size,
    })
    reloadAndVerifyMessages(messageStorage)
      .catch((err) => logger.error(err))
      .finally(() => {
        alreadyReloadingMessages = false
        logger.info('Presigned messages reload job finished')
      })
  }

  return { handleJob, reloadAndVerifyMessages }
}
