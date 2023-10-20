import type { Dependencies } from './interface.js'
import { MessageStorage } from '../services/job-processor/message-storage.js'

export const makeApp = ({
  config,
  logger,
  job,
  messagesProcessor,
  httpHandler,
  executionApi,
  consensusApi,
  appInfoReader,
}: Dependencies) => {
  const { OPERATOR_ID, BLOCKS_PRELOAD, BLOCKS_LOOP, JOB_INTERVAL } = config

  let timer: NodeJS.Timer | null = null
  let reloadTimer: NodeJS.Timer | null = null

  const run = async () => {
    const version = await appInfoReader.getVersion()
    const mode = config.MESSAGES_LOCATION ? 'message' : 'webhook'
    logger.info(`Validator Ejector v${version} started in ${mode} mode`, config)

    await executionApi.checkSync()
    await consensusApi.checkSync()

    await httpHandler.run()

    /**
     * Appends new messages to messageStorage,
     * Not modifying the messagesStorage reference
     *
     * Notes:
     *   - new messages are identified by difference of signature
     */
    const reloadAndVerifyMessages = async (messagesStorage: MessageStorage) => {
      if (!config.MESSAGES_LOCATION) {
        // webhook mode
        return
      }

      logger.info(`Will reload messages`)
      logger.info(`Existing messages count ${messagesStorage.size}`)
      const newMessagesStats = await messagesProcessor.loadToMemoryStorage(
        messagesStorage
      )

      logger.info(
        `Added ${newMessagesStats.added} new messages, updated ${newMessagesStats.updated} messages`
      )
      logger.info(`Total messages count ${messagesStorage.size}`)
    }

    const messageStorage = new MessageStorage()
    await reloadAndVerifyMessages(messageStorage)

    logger.info(
      `Starting, searching only for requests for operator ${OPERATOR_ID}`
    )

    logger.info(`Loading initial events for ${BLOCKS_PRELOAD} last blocks`)
    await job.once({
      eventsNumber: BLOCKS_PRELOAD,
      messageStorage: messageStorage,
    })

    logger.info(
      `Starting ${
        JOB_INTERVAL / 1000
      } seconds polling for ${BLOCKS_LOOP} last blocks`
    )

    if (mode === 'message') {
      let reloadingMessages = false
      reloadTimer = setInterval(() => {
        if (reloadingMessages) {
          return
        }
        reloadingMessages = true
        reloadAndVerifyMessages(messageStorage)
          .catch((err) => logger.error(err))
          .finally(() => {
            reloadingMessages = false
          })
      }, config.JOB_INTERVAL * 2)
    }

    timer = job.pooling({
      eventsNumber: BLOCKS_LOOP,
      messageStorage: messageStorage,
    })
  }

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    if (reloadTimer) {
      clearInterval(reloadTimer)
      reloadTimer = null
    }
  }

  return { run, stop }
}
