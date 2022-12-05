import {
  config,
  logger,
  jobRunner,
  executionApi,
  messagesProcessor,
} from '../lib.js'

const { OPERATOR_ID, BLOCKS_PRELOAD, MESSAGES_LOCATION } = config

export const run = async () => {
  logger.info('Application started', config)

  const lastBlock = await executionApi.latestBlockNumber()
  logger.info(`Started from block ${lastBlock}`)

  logger.log(`Loading messages from ${MESSAGES_LOCATION}`)
  const messages = await messagesProcessor.load()
  logger.log(`Loaded ${messages.length} messages`)

  await messagesProcessor.verify(messages)

  logger.log('Validated messages')
  logger.log(
    `Starting, searching only for requests for operator ${OPERATOR_ID}`
  )
  logger.log(`requesting historical events for ${BLOCKS_PRELOAD} blocks`)

  await jobRunner(async (eventsNumber) => {
    const pubKeys = await executionApi.loadExitEvents(lastBlock, eventsNumber)
    logger.debug(`Loaded ${pubKeys.length} events`)

    for (const pubKey of pubKeys) {
      logger.debug(`Handling exit for ${pubKey}`)
      await messagesProcessor.exit(messages, pubKey)
    }
  })
}
