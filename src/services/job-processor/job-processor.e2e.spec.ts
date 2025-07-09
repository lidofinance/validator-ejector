import { makeJobProcessor } from './service.js'
import { makeConsensusApi } from '../consensus-api/service.js'
import { makeExecutionApi } from '../execution-api/service.js'
import { makeExitLogsService } from '../exit-logs/service.js'
import { makeMessagesProcessor } from '../messages-processor/service.js'
import { makeWebhookProcessor } from '../webhook-caller/service.js'
import { MessageStorage } from './message-storage.js'
import {
  makeLogger,
  makeRequest,
  retry,
  logger as loggerMiddleware,
  abort,
} from '../../lib/index.js'
import { mockConfig } from '../../test/config.js'
import { expect } from 'vitest'

describe('JobProcessor integration tests', () => {
  let jobProcessor: ReturnType<typeof makeJobProcessor>
  let exitLogs: ReturnType<typeof makeExitLogsService>
  let executionApi: ReturnType<typeof makeExecutionApi>
  let consensusApi: ReturnType<typeof makeConsensusApi>
  let messageReloader: any
  let config: ReturnType<typeof mockConfig>
  let messageStorage: MessageStorage

  beforeEach(() => {
    const logger = makeLogger({
      level: 'error',
      format: 'simple',
    })

    config = mockConfig(logger, {
      CONSENSUS_NODE:
        process.env.CONSENSUS_NODE ??
        'https://ethereum-beacon-api.publicnode.com',
      EXECUTION_NODE:
        process.env.EXECUTION_NODE ?? 'https://ethereum-rpc.publicnode.com',
      LOCATOR_ADDRESS:
        process.env.LOCATOR_ADDRESS ??
        '0xC1d0b3DE6792Bf6b4b37EccdcC24e45978Cfd2Eb',
      STAKING_MODULE_ID: '1',
      DRY_RUN: true,
      TRUST_MODE: true, // Verifying logic tested inside fetcher.spec.ts
    })

    const request = makeRequest([
      retry(3),
      loggerMiddleware(logger),
      abort(30_000),
    ])

    consensusApi = makeConsensusApi(request, logger, config)
    executionApi = makeExecutionApi(request, logger, config)

    const metrics = {
      exitActions: { inc: vi.fn() },
      updateLeftMessages: vi.fn(),
    }

    exitLogs = makeExitLogsService(
      logger,
      executionApi,
      consensusApi,
      config,
      metrics as any
    )
    const messagesProcessor = makeMessagesProcessor({
      logger,
      config,
      localFileReader: {} as any,
      consensusApi,
      metrics: {} as any,
      s3Service: {} as any,
      gsService: {} as any,
    })
    const webhookProcessor = makeWebhookProcessor(
      { WEBHOOK_ABORT_TIMEOUT_MS: 5000, WEBHOOK_MAX_RETRIES: 3 },
      logger,
      metrics as any
    )

    messageReloader = {
      reloadAndVerifyMessages: vi.fn().mockResolvedValue(undefined),
    }

    jobProcessor = makeJobProcessor({
      logger,
      config,
      messageReloader,
      executionApi,
      exitLogs,
      consensusApi,
      messagesProcessor,
      webhookProcessor,
      metrics: metrics as any,
    })

    messageStorage = new MessageStorage()
  })

  it('should handle job with validators fetched in batches', async () => {
    config.OPERATOR_IDS = [12345, 67890]

    const ackSpy12345 = vi.fn()
    const ackSpy67890 = vi.fn()

    const getLogsSpy = vi.spyOn(exitLogs, 'getLogs').mockResolvedValue([
      {
        validatorIndex: '12345',
        validatorPubkey: 'pubkey1',
        blockNumber: 1000,
        nodeOperatorId: 12345,
        acknowledged: false,
        ack: ackSpy12345,
      },
      {
        validatorIndex: '67890',
        validatorPubkey: 'pubkey2',
        blockNumber: 800, // Old block to trigger FINALIZED_BLOCK_EQUIVALENT condition (1000 - 800 = 200 > 120)
        nodeOperatorId: 67890,
        acknowledged: false,
        ack: ackSpy67890,
      },
    ])

    const fetchValidatorsBatchSpy = vi.spyOn(
      consensusApi,
      'fetchValidatorsBatch'
    )
    const isValidatorExitingSpy = vi.spyOn(consensusApi, 'isValidatorExiting')

    await jobProcessor.handleJob({
      eventsNumber: 10,
      messageStorage,
    })

    expect(messageReloader.reloadAndVerifyMessages).toHaveBeenCalledWith(
      messageStorage
    )
    expect(getLogsSpy).toHaveBeenCalledWith([12345, 67890], expect.any(Number))
    expect(fetchValidatorsBatchSpy).toHaveBeenCalledWith(
      ['12345', '67890'],
      1000,
      'head'
    )
    expect(fetchValidatorsBatchSpy).toHaveBeenCalledWith(
      ['12345', '67890'],
      1000,
      'finalized'
    )
    expect(isValidatorExitingSpy).toHaveBeenCalled()
    expect(ackSpy12345).not.toHaveBeenCalled()
    expect(ackSpy67890).toHaveBeenCalled()
  })
})
