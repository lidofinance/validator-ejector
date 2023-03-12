import type { Dependencies } from './interface.js'

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
  const {
    OPERATOR_ID,
    BLOCKS_PRELOAD,
    MESSAGES_LOCATION,
    BLOCKS_LOOP,
    JOB_INTERVAL,
  } = config

  const run = async () => {
    const version = await appInfoReader.getVersion()
    logger.info(`Application started, version ${version}`, config)

    await executionApi.checkSync()
    await consensusApi.checkSync()

    await httpHandler.run()

    logger.info(`Loading messages from ${MESSAGES_LOCATION}`)
    const messages = await messagesProcessor.load()
    logger.info(`Loaded ${messages.length} messages`)

    logger.info('Validating messages')
    await messagesProcessor.verify(messages)

    logger.info(
      `Starting, searching only for requests for operator ${OPERATOR_ID}`
    )

    logger.info(`Loading initial events for ${BLOCKS_PRELOAD} last blocks`)
    await job.once({ eventsNumber: BLOCKS_PRELOAD, messages })

    logger.info(
      `Starting ${
        JOB_INTERVAL / 1000
      } seconds polling for ${BLOCKS_LOOP} last blocks`
    )

    job.pooling({ eventsNumber: BLOCKS_LOOP, messages })
  }

  return { run }
}
