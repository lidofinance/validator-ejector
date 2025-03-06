import type { Dependencies } from './interface.js'
import { MessageStorage } from '../services/job-processor/message-storage.js'

export const makeApp = ({
  config,
  logger,
  job,
  metrics,
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
    OPERATOR_IDENTIFIERS,
  } = config

  let ejectorCycleTimer: NodeJS.Timer | null = null

  const run = async () => {
    const version = await appInfoReader.getVersion()
    const mode = config.MESSAGES_LOCATION ? 'message' : 'webhook'
    logger.info(`Validator Ejector v${version} started in ${mode} mode`, config)

    metrics.buildInfo
      .labels({
        version,
        mode,
      })
      .inc()

    await executionApi.checkSync()
    await consensusApi.checkSync()

    await httpHandler.run()

    const messageStorage = new MessageStorage()

    logger.info(
      `Starting, searching only for requests for operators ${
        OPERATOR_ID ?? OPERATOR_IDENTIFIERS
      }`
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
  }

  return { run, stop }
}
