import type { LoggerService } from '../../lib/index.js'
import type { ExecutionApiService } from '../execution-api/service.js'
import type { ConfigService } from '../config/service.js'
import type { MessagesProcessorService } from '../messages-processor/service.js'
import type { ConsensusApiService } from '../consensus-api/service.js'
import type { WebhookProcessorService } from '../webhook-caller/service.js'
import type { MetricsService } from '../prom/service.js'
import type { MessageStorage } from './message-storage.js'
import type { MessageReloader } from '../message-reloader/message-reloader.js'
import { ExitLogsService } from 'services/exit-logs/service.js'

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

const FINALIZED_BLOCK_EQUIVALENT = 120

export type JobProcessorService = ReturnType<typeof makeJobProcessor>

export const makeJobProcessor = ({
  logger,
  config,
  messageReloader,
  executionApi,
  exitLogs,
  consensusApi,
  messagesProcessor,
  webhookProcessor,
  metrics,
}: {
  logger: LoggerService
  config: ConfigService
  messageReloader: MessageReloader
  executionApi: ExecutionApiService
  exitLogs: ExitLogsService
  consensusApi: ConsensusApiService
  messagesProcessor: MessagesProcessorService
  webhookProcessor: WebhookProcessorService
  metrics: MetricsService
}) => {
  const handleJob = async ({
    messageStorage,
  }: {
    eventsNumber: number
    messageStorage: MessageStorage
  }) => {
    const operatorIds = config.OPERATOR_IDENTIFIERS
      ? [...(config.OPERATOR_IDENTIFIERS ?? [])]
      : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        [config.OPERATOR_ID!]

    logger.info('Job started', {
      operatorIds,
      stakingModuleId: config.STAKING_MODULE_ID,
    })

    await messageReloader.reloadAndVerifyMessages(messageStorage)

    // Resolving contract addresses on each job to automatically pick up changes without requiring a restart
    await executionApi.resolveExitBusAddress()
    await executionApi.resolveConsensusAddress()

    const lastBlockNumber = await executionApi.latestBlockNumber()

    const eventsForEject = await exitLogs.getLogs(operatorIds, lastBlockNumber)

    logger.info('Handling ejection requests', {
      amount: eventsForEject.length,
    })

    for (const [ix, event] of eventsForEject.entries()) {
      logger.debug(`Handling exit ${ix + 1}/${eventsForEject.length}`, event)

      if (event.acknowledged) {
        logger.debug('Event already acknowledged, skipping')
        continue
      }

      try {
        if (await consensusApi.isExiting(event.validatorPubkey)) {
          logger.info('Validator is already exiting(ed), skipping', {
            validatorIndex: event.validatorIndex,
          })
          // Acknowledge the event to avoid processing it again
          // We do an additional check, because if we didn't check for finalized,
          // we might miss the reorganization.
          if (
            lastBlockNumber - event.blockNumber > FINALIZED_BLOCK_EQUIVALENT ||
            (await consensusApi.isExiting(event.validatorPubkey, 'finalized'))
          ) {
            event.ack()
          }
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

      logger.info('Updating exit messages left metrics from contract state')
      try {
        const lastRequestedValIx =
          await exitLogs.verifier.lastRequestedValidatorIndex(
            event.nodeOperatorId
          )
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
