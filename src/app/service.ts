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
  const { OPERATOR_ID, BLOCKS_PRELOAD, BLOCKS_LOOP, JOB_INTERVAL } = config

  const run = async () => {
    const version = await appInfoReader.getVersion()
    const mode = config.MESSAGES_LOCATION ? 'message' : 'webhook'
    logger.info(`Validator Ejector v${version} started in ${mode} mode`, config)

    await executionApi.checkSync()
    await consensusApi.checkSync()

    await httpHandler.run()

    const messages = await messagesProcessor.load()
    const verifiedMessages = await messagesProcessor.verify(messages)

    logger.info(
      `Starting, searching only for requests for operator ${OPERATOR_ID}`
    )

    logger.info(`Loading initial events for ${BLOCKS_PRELOAD} last blocks`)
    await job.once({ eventsNumber: BLOCKS_PRELOAD, messages: verifiedMessages })

    logger.info(
      `Starting ${
        JOB_INTERVAL / 1000
      } seconds polling for ${BLOCKS_LOOP} last blocks`
    )

    job.pooling({ eventsNumber: BLOCKS_LOOP, messages: verifiedMessages })
  }

  return { run }
}
