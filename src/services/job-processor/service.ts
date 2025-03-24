import type { LoggerService } from '../../lib/index.js'
import type { ExecutionApiService } from '../execution-api/service.js'
import type { ConfigService } from '../config/service.js'
import type { MessagesProcessorService } from '../messages-processor/service.js'
import type { ConsensusApiService } from '../consensus-api/service.js'
import type { WebhookProcessorService } from '../webhook-caller/service.js'
import type { MetricsService } from '../prom/service.js'
import type { MessageStorage } from './message-storage.js'
import type { MessageReloader } from '../message-reloader/message-reloader.js'

export type ExitMessage = {
  message: {
    epoch: string
    validator_index: string
  }
  signature: string
}

export type ExitMessageWithMetadata = {
  data: ExitMessage
  meta: {
    fileChecksum: string
    filename: string
    forkVersion: string
  }
}

export type JobProcessorService = ReturnType<typeof makeJobProcessor>

export const makeJobProcessor = ({
  logger,
  config,
  messageReloader,
  executionApi,
  consensusApi,
  messagesProcessor,
  webhookProcessor,
  metrics,
}: {
  logger: LoggerService
  config: ConfigService
  messageReloader: MessageReloader
  executionApi: ExecutionApiService
  consensusApi: ConsensusApiService
  messagesProcessor: MessagesProcessorService
  webhookProcessor: WebhookProcessorService
  metrics: MetricsService
}) => {
  const handleJob = async ({
    eventsNumber,
    messageStorage,
  }: {
    eventsNumber: number
    messageStorage: MessageStorage
  }) => {
    const operatorIds = config.OPERATOR_ID
      ? [config.OPERATOR_ID]
      : [...(config.OPERATOR_IDENTIFIERS ?? [])]

    logger.info('Job started', {
      operatorIds,
      stakingModuleId: config.STAKING_MODULE_ID,
    })

    await messageReloader.reloadAndVerifyMessages(messageStorage)

    // Resolving contract addresses on each job to automatically pick up changes without requiring a restart
    await executionApi.resolveExitBusAddress()
    await executionApi.resolveConsensusAddress()

    const toBlock = await executionApi.latestBlockNumber()
    const fromBlock = toBlock - eventsNumber
    logger.info('Fetched the latest block from EL', { latestBlock: toBlock })

    for (const operatorId of operatorIds) {
      logger.info('Fetching request events from the Exit Bus', {
        eventsNumber,
        fromBlock,
        toBlock,
      })

      const eventsForEject = await executionApi.logs(
        fromBlock,
        toBlock,
        operatorId
      )

      logger.info('Handling ejection requests', {
        amount: eventsForEject.length,
      })

      for (const [ix, event] of eventsForEject.entries()) {
        logger.debug(`Handling exit ${ix + 1}/${eventsForEject.length}`, event)

        try {
          if (await consensusApi.isExiting(event.validatorPubkey)) {
            logger.info('Validator is already exiting(ed), skipping')
            continue
          }

          if (config.DRY_RUN) {
            logger.info('Not initiating an exit in dry run mode')
            continue
          }

          if (config.VALIDATOR_EXIT_WEBHOOK) {
            await webhookProcessor.send(config.VALIDATOR_EXIT_WEBHOOK, event)
          } else {
            await messagesProcessor.exit(messageStorage, event)
          }
        } catch (e) {
          logger.error(`Unable to process exit for ${event.validatorPubkey}`, e)
          metrics.exitActions.inc({ result: 'error' })
        }
      }

      logger.info('Updating exit messages left metrics from contract state')
      try {
        const lastRequestedValIx =
          await executionApi.lastRequestedValidatorIndex(operatorId)
        metrics.updateLeftMessages(messageStorage, lastRequestedValIx)
      } catch {
        logger.error(
          'Unable to update exit messages left metrics from contract state'
        )
      }
    }

    logger.info('Job finished')
  }

  return { handleJob }
}
