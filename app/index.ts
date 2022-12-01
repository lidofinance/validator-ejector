import { config, logger, jobRunner, contract, provider } from '../lib.js'

import {
  filterEvents,
  getLastBlock,
  loadEvents,
  loadMessages,
  processExit,
  verifyMessages,
} from './controller.js'

const { OPERATOR_ID, BLOCKS_PRELOAD, MESSAGES_LOCATION } = config

export const run = async () => {
  logger.info('Application started', config)

  const lastBlock = await getLastBlock(provider)

  logger.log(`Loading messages from ${MESSAGES_LOCATION}`)
  const messages = await loadMessages()
  logger.log(`Loaded ${messages.length} messages`)

  await verifyMessages(messages)

  logger.log('Validated messages')
  logger.log(
    `Starting, searching only for requests for operator ${OPERATOR_ID}`
  )
  logger.log(`requesting historical events for ${BLOCKS_PRELOAD} blocks`)

  await jobRunner(async (eventsNumber) => {
    const events = await loadEvents(contract, lastBlock, eventsNumber)

    logger.debug(`Loaded ${events.length} events`)
    const filteredEvents = filterEvents(events)
    logger.debug(`Filtered to ${filteredEvents.length} for us`)

    for (const event of filteredEvents) {
      logger.debug(`Handling exit for ${event.args?.validatorPubkey}`)
      await processExit(messages, event.args?.validatorPubkey)
    }
  })
}
