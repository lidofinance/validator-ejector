import type { LoggerService } from 'lido-nanolib'
import type { ExecutionApiService } from '../execution-api/service.js'
import type { ConfigService } from '../config/service.js'
import type { MessagesProcessorService } from '../messages-processor/service.js'
import type { ConsensusApiService } from '../consensus-api/service.js'
import type { WebhookProcessorService } from '../webhook-sender/service.js'

type ExitMessage = {
  message: {
    epoch: string
    validator_index: string
  }
  signature: string
}

export type JobProcessorService = ReturnType<typeof makeJobProcessor>

export const makeJobProcessor = ({
  logger,
  config,
  executionApi,
  consensusApi,
  messagesProcessor,
  webhookProcessor,
}: {
  logger: LoggerService
  config: ConfigService
  executionApi: ExecutionApiService
  consensusApi: ConsensusApiService
  messagesProcessor: MessagesProcessorService
  webhookProcessor: WebhookProcessorService
}) => {
  const handleJob = async ({
    eventsNumber,
    messages,
  }: {
    eventsNumber: number
    messages: ExitMessage[]
  }) => {
    logger.info('Job started', {
      operatorId: config.OPERATOR_ID,
      stakingModuleId: config.STAKING_MODULE_ID,
      loadedMessages: messages.length,
    })

    // Resolving contract addresses on each job to automatically pick up changes without requiring a restart
    await executionApi.resolveExitBusAddress()
    await executionApi.resolveConsensusAddress()

    const toBlock = await executionApi.latestBlockNumber()
    const fromBlock = toBlock - eventsNumber
    logger.info('Fetched the latest block from EL', { latestBlock: toBlock })

    logger.info('Fetching request events from the Exit Bus', {
      eventsNumber,
      fromBlock,
      toBlock,
    })

    const eventsForEject = await executionApi.logs(fromBlock, toBlock)

    logger.info('Handling ejection requests', {
      amount: eventsForEject.length,
    })

    for (const event of eventsForEject) {
      logger.info('Handling exit', event)
      try {
        if (await consensusApi.isExiting(event.validatorPubkey)) {
          logger.debug(
            `Exit was initiated, but ${event.validatorPubkey} is already exiting(ed), skipping`
          )
          return
        }

        await messagesProcessor.exit(messages, event.validatorPubkey)
        await webhookProcessor.send(event)
      } catch (e) {
        logger.error(`Unable to process exit for ${event.validatorPubkey}`, e)
      }
    }

    logger.info('Job finished')
  }

  return { handleJob }
}
