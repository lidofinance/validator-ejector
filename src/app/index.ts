import { config, logger, jobRunner, executionApi, messagesLoader } from '../lib.js'

import { loadExitEvents, processExit, verifyMessages } from './controller.js'

const { OPERATOR_ID, BLOCKS_PRELOAD, MESSAGES_LOCATION } = config

export const run = async () => {
  logger.info('Application started', config)

  const lastBlock = await executionApi.latestBlockNumber()
  logger.info(`Started from block ${lastBlock}`)

  logger.log(`Loading messages from ${MESSAGES_LOCATION}`)
  const messages = await messagesLoader.load()
  logger.log(`Loaded ${messages.length} messages`)

  await verifyMessages(messages)

  logger.log('Validated messages')
  logger.log(
    `Starting, searching only for requests for operator ${OPERATOR_ID}`
  )
  logger.log(`requesting historical events for ${BLOCKS_PRELOAD} blocks`)

  await jobRunner(async (eventsNumber) => {
    const pubKeys = await loadExitEvents(lastBlock, eventsNumber)
    logger.debug(`Loaded ${pubKeys.length} events`)

    for (const pubKey of pubKeys) {
      logger.debug(`Handling exit for ${pubKey}`)
      await processExit(messages, pubKey)
    }
  })
}
