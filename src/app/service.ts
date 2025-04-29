import type { Dependencies } from './interface.js'
import { MessageStorage } from '../services/job-processor/message-storage.js'
import { getHeapStatistics } from 'v8'

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
  const { OPERATOR_ID, BLOCKS_PRELOAD, JOB_INTERVAL, OPERATOR_IDENTIFIERS } =
    config

  let ejectorCycleTimer: NodeJS.Timer | null = null

  const run = async () => {
    const version = await appInfoReader.getVersion()
    const mode = config.MESSAGES_LOCATION ? 'message' : 'webhook'

    const { heap_size_limit } = getHeapStatistics()
    const heapLimit = Math.round(heap_size_limit / 1024 / 1024).toString()

    logger.info(`Validator Ejector v${version} started in ${mode} mode`, {
      ...config,
      heapLimit,
    })

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
    const fetchTimeStart = performance.now()

    await job.once({
      messageStorage: messageStorage,
    })

    const fetchTimeEnd = performance.now()
    const fetchTime = Math.ceil(fetchTimeEnd - fetchTimeStart) / 1000
    logger.info(`Initial events loaded in ${fetchTime} seconds`)

    logger.info(`Starting ${JOB_INTERVAL / 1000} seconds polling`)

    ejectorCycleTimer = job.loop({
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
