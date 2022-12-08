import type { Dependencies } from './interface.js'

export const makeApp = ({
  config,
  logger,
  job,
  executionApi,
  messagesProcessor,
}: Dependencies) => {
  const {
    OPERATOR_ID,
    BLOCKS_PRELOAD,
    MESSAGES_LOCATION,
    BLOCKS_LOOP,
    JOB_INTERVAL,
  } = config

  const run = async () => {
    logger.info('Application started', config)

    const lastBlock = await executionApi.latestBlockNumber()
    logger.info(`Started from block ${lastBlock}`)

    logger.info(`Loading messages from ${MESSAGES_LOCATION}`)
    const messages = await messagesProcessor.load()
    logger.info(`Loaded ${messages.length} messages`)

    logger.info('Validating messages')
    await messagesProcessor.verify(messages)

    logger.info(
      `Starting, searching only for requests for operator ${OPERATOR_ID}`
    )

    logger.info(`Loading initial events for ${BLOCKS_PRELOAD} last blocks`)
    await job.once({ eventsNumber: BLOCKS_PRELOAD, lastBlock, messages })

    logger.info(
      `Starting ${
        JOB_INTERVAL / 1000
      } seconds polling for ${BLOCKS_LOOP} last blocks`
    )
    job.pooling({ eventsNumber: BLOCKS_LOOP, lastBlock, messages })
  }

  return { run }
}
