import type { Dependencies } from './interface.js'
import { MessageStorage } from '../services/job-processor/message-storage.js'

export const makeApp = ({
  config,
  logger,
  job,
  messageReloader,
  messageReloaderJob,
  httpHandler,
  executionApi,
  consensusApi,
  appInfoReader,
}: Dependencies) => {
  const {
    OPERATOR_ID,
    BLOCKS_PRELOAD,
    BLOCKS_LOOP,
    JOB_INTERVAL,
    JOB_MESSAGE_RELOADING_INTERVAL,
  } = config

  let ejectorCycleTimer: NodeJS.Timer | null = null
  let messageReloadingTimer: NodeJS.Timer | null = null

  const run = async () => {
    const version = await appInfoReader.getVersion()
    const mode = config.MESSAGES_LOCATION ? 'message' : 'webhook'
    logger.info(`Validator Ejector v${version} started in ${mode} mode`, config)

    await executionApi.checkSync()
    await consensusApi.checkSync()

    await httpHandler.run()

    const messageStorage = new MessageStorage()
    if (mode === 'message') {
      await messageReloader.reloadAndVerifyMessages(messageStorage)
    }

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
      logger.info(
        `Message hot-reloading enabled with ${
          JOB_MESSAGE_RELOADING_INTERVAL / 1000
        }`
      )
      messageReloadingTimer = messageReloaderJob.pooling({
        messageStorage: messageStorage,
      })
    } else {
      logger.info(
        `Message hot-reloading disabled, because Webhook mode enabled`
      )
    }

    ejectorCycleTimer = job.pooling({
      eventsNumber: BLOCKS_LOOP,
      messageStorage: messageStorage,
    })
  }

  const stop = () => {
    if (ejectorCycleTimer) {
      clearInterval(ejectorCycleTimer)
      ejectorCycleTimer = null
    }
    if (messageReloadingTimer) {
      clearInterval(messageReloadingTimer)
      messageReloadingTimer = null
    }
  }

  return { run, stop }
}
