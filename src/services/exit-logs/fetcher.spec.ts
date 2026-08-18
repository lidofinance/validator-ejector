import { ExitLogsService, makeExitLogsService } from './service.js'
import {
  LoggerService,
  RequestService,
  makeRequest,
  notOkError,
} from '../../lib/index.js'
import { ConsensusApiService } from '../consensus-api/service.js'
import {
  oracleValidatorExitRequestEventsMock,
  oracleSubmitReportDataTransactionMock,
  oracleSubmitReportTransactionMock,
  oracleConsensusReachedEventsMock,
  hoodiValidatorExitRequestEventsMock,
  hoodiSubmitExitRequestsDataTransactionMock,
  HOODI_EXIT_VALIDATOR_INDEX,
  HOODI_EXIT_VALIDATOR_PUBKEY,
  HOODI_SUBMIT_EXIT_REQUESTS_DATA_INPUT,
  HOODI_SUBMIT_EXIT_REQUESTS_DATA_TX,
} from './fixtures.js'
import { mockEthServer } from '../../test/mock-eth-server.js'
import { mockLogger } from '../../test/logger.js'
import { mockConfig } from '../../test/config.js'
import type { ConfigService, EjectorScope } from '../config/service.js'
import { MetricsService } from 'services/prom/service.js'
import { makeExecutionApi } from '../execution-api/service.js'
import nock from 'nock'
import { ethers } from 'ethers'

describe('makeConsensusApi logs', () => {
  let api: ExitLogsService
  let request: RequestService
  let logger: LoggerService
  let config: ConfigService

  const metrics = {
    eventSecurityVerification: {
      inc: vi.fn(),
    },
  } as unknown as MetricsService
  const scope = (
    operatorIds: number[] = [1],
    stakingModuleId = '1'
  ): EjectorScope[] => [{ stakingModuleId, operatorIds }]

  const mockService = (validatorIndices: string[] = ['351636']) => {
    const executionApi = makeExecutionApi(request, logger, config)

    Object.defineProperty(executionApi, 'exitBusAddress', {
      get: vi.fn(() => '0x0000000000000000000000000000000000000000'),
    })

    Object.defineProperty(executionApi, 'consensusAddress', {
      get: vi.fn(() => '0x0000000000000000000000000000000000000000'),
    })

    const consensusApi = {
      validatePublicKeys: vi.fn().mockResolvedValue(new Set(validatorIndices)),
    } as unknown as ConsensusApiService

    api = makeExitLogsService(
      logger,
      executionApi,
      consensusApi,
      config,
      metrics
    )
  }

  beforeEach(() => {
    nock.cleanAll()
    request = makeRequest([])
    logger = mockLogger()
    config = mockConfig(logger, {
      EXECUTION_NODE: 'http://localhost:4455',
    })
    mockService()
  })

  it('should fetch and parse withdrawal events without security when TRUST_MODE is true', async () => {
    const oracleValidatorExitRequestEvents = mockEthServer(
      oracleValidatorExitRequestEventsMock(),
      config.EXECUTION_NODE[0]
    )
    config.TRUST_MODE = true
    mockService()

    const res = await api.fetcher.getLogs(123, 123, scope())

    expect(oracleValidatorExitRequestEvents.isDone()).to.be.true
    expect(res.length).toBe(1)
    expect(res[0].stakingModuleId).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
    expect(metrics.eventSecurityVerification.inc).toBeCalledTimes(0)
  })

  it('should fallback to secondary EL while loading exit logs', async () => {
    const primary = 'http://primary.el.example:8545'
    const secondary = 'http://secondary.el.example:8545'
    request = makeRequest([notOkError()])
    config = mockConfig(logger, {
      EXECUTION_NODE: `${primary},${secondary}`,
    })
    config.TRUST_MODE = true
    mockService()

    const validatorExitRequestMock = oracleValidatorExitRequestEventsMock()
    const primaryScope = nock(primary)
      .post('/', (body) => validatorExitRequestMock.bodyMatcher(body))
      .reply(503, 'busy')
    const secondaryScope = mockEthServer(validatorExitRequestMock, secondary)

    const res = await api.fetcher.getLogs(123, 123, scope())

    expect(primaryScope.isDone()).toBe(true)
    expect(secondaryScope.isDone()).toBe(true)
    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(logger.warn).toHaveBeenCalledWith(
      'EL endpoint failed, trying next',
      expect.objectContaining({ url: 'primary.el.example:8545' })
    )
  })

  it('should fallback to secondary EL while verifying transaction details', async () => {
    const primary = 'http://primary.el.example:8545'
    const secondary = 'http://secondary.el.example:8545'
    request = makeRequest([notOkError()])
    config = mockConfig(logger, {
      EXECUTION_NODE: `${primary},${secondary}`,
    })
    config.ORACLE_ADDRESSES_ALLOWLIST = [
      '0x7eE534a6081d57AFB25b5Cff627d4D26217BB0E9',
    ]
    config.SUBMIT_TX_HASH_ALLOWLIST = []
    mockService()

    const reportDataTxMock = oracleSubmitReportDataTransactionMock()
    mockEthServer(oracleValidatorExitRequestEventsMock(), primary)
    const primaryTxScope = nock(primary)
      .post(
        '/',
        (body) =>
          body.method === reportDataTxMock.body.method &&
          body.params[0] === reportDataTxMock.body.params[0]
      )
      .reply(503, 'busy')
    const secondaryTxScope = nock(secondary)
      .post(
        '/',
        (body) =>
          body.method === reportDataTxMock.body.method &&
          body.params[0] === reportDataTxMock.body.params[0]
      )
      .reply(200, reportDataTxMock.result)
    mockEthServer(oracleConsensusReachedEventsMock(), primary)
    mockEthServer(oracleSubmitReportTransactionMock(), primary)

    const res = await api.fetcher.getLogs(123, 123, scope())

    expect(primaryTxScope.isDone()).toBe(true)
    expect(secondaryTxScope.isDone()).toBe(true)
    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(logger.warn).toHaveBeenCalledWith(
      'EL endpoint failed, trying next',
      expect.objectContaining({ url: 'primary.el.example:8545' })
    )
  })

  it('should query each staking module scope separately', async () => {
    config = mockConfig(logger, {
      EXECUTION_NODE: 'http://localhost:4455',
    })
    mockService([])

    const topic = (id: number) =>
      ethers.utils.hexZeroPad(ethers.BigNumber.from(id).toHexString(), 32)

    const firstModuleLogsMock = nock(config.EXECUTION_NODE[0])
      .post('/', (body) => {
        expect(body.method).toBe('eth_getLogs')
        expect(body.params[0].topics[1]).toEqual([topic(1)])
        expect(body.params[0].topics[2]).toEqual([topic(1)])
        return true
      })
      .reply(200, { result: [] })

    const secondModuleLogsMock = nock(config.EXECUTION_NODE[0])
      .post('/', (body) => {
        expect(body.method).toBe('eth_getLogs')
        expect(body.params[0].topics[1]).toEqual([topic(2)])
        expect(body.params[0].topics[2]).toEqual([topic(2), topic(3)])
        return true
      })
      .reply(200, { result: [] })

    const res = await api.fetcher.getLogs(123, 123, [
      { stakingModuleId: '1', operatorIds: [1] },
      { stakingModuleId: '2', operatorIds: [2, 3] },
    ])

    expect(firstModuleLogsMock.isDone()).toBe(true)
    expect(secondModuleLogsMock.isDone()).toBe(true)
    expect(res).toHaveLength(0)
  })

  it('should verify withdrawal via oracle withdrawal events if recoveredAddress in ORACLE_ADDRESSES_ALLOWLIST', async () => {
    mockEthServer(
      oracleValidatorExitRequestEventsMock(),
      config.EXECUTION_NODE[0]
    )
    mockEthServer(
      oracleSubmitReportDataTransactionMock(),
      config.EXECUTION_NODE[0]
    )
    mockEthServer(oracleSubmitReportTransactionMock(), config.EXECUTION_NODE[0])
    mockEthServer(oracleConsensusReachedEventsMock(), config.EXECUTION_NODE[0])

    config.ORACLE_ADDRESSES_ALLOWLIST = [
      '0x7eE534a6081d57AFB25b5Cff627d4D26217BB0E9',
    ]
    config.SUBMIT_TX_HASH_ALLOWLIST = []
    mockService()

    const res = await api.fetcher.getLogs(123, 123, scope())

    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
  })

  it('should find ConsensusReached in the chunked ORACLE_FRAME_BLOCKS window when LOAD_LOGS_STEP is small', async () => {
    config = mockConfig(logger, {
      EXECUTION_NODE: 'http://localhost:4455',
      LOAD_LOGS_STEP: 500,
    })
    config.ORACLE_ADDRESSES_ALLOWLIST = [
      '0x7eE534a6081d57AFB25b5Cff627d4D26217BB0E9',
    ]
    config.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = []
    mockService()

    mockEthServer(
      oracleValidatorExitRequestEventsMock(),
      config.EXECUTION_NODE[0]
    )
    mockEthServer(
      oracleSubmitReportDataTransactionMock(),
      config.EXECUTION_NODE[0]
    )
    mockEthServer(oracleSubmitReportTransactionMock(), config.EXECUTION_NODE[0])

    const consensusMock = oracleConsensusReachedEventsMock()
    const consensusTopic = consensusMock.result.result[0].topics[0]
    const consensusEventBlock = parseInt(
      consensusMock.result.result[0].blockNumber,
      16
    )
    // Verifier window: exit request event block (0x855ad2) minus
    // ORACLE_FRAME_BLOCKS (7200), split by LOAD_LOGS_STEP=500 into 15 chunks
    const expectedChunks = 15
    const ranges: [number, number][] = []
    nock(config.EXECUTION_NODE[0])
      .post(
        '/',
        (body) =>
          body.method === 'eth_getLogs' &&
          body.params[0].topics[0] === consensusTopic
      )
      .times(expectedChunks)
      .reply(200, (_uri, body: any) => {
        const from = parseInt(body.params[0].fromBlock, 16)
        const to = parseInt(body.params[0].toBlock, 16)
        ranges.push([from, to])
        // Only the chunk actually covering the event block returns it
        return from <= consensusEventBlock && consensusEventBlock <= to
          ? consensusMock.result
          : { result: [] }
      })

    const res = await api.fetcher.getLogs(123, 123, scope(), {}, {}, {})

    // The event survives even though 14 of 15 chunks are empty
    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')

    // The chunks cover exactly the toBlock-7200..toBlock window,
    // contiguously — no gaps, no overlaps, pinned endpoints
    const exitEventBlock = parseInt(
      oracleValidatorExitRequestEventsMock().result.result[0].blockNumber,
      16
    )
    expect(ranges.length).toBe(expectedChunks)
    expect(ranges[0][0]).toBe(exitEventBlock - 7200)
    expect(ranges[ranges.length - 1][1]).toBe(exitEventBlock)
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i][0]).toBe(ranges[i - 1][1] + 1)
    }
    expect(
      ranges.filter(
        ([from, to]) => from <= consensusEventBlock && consensusEventBlock <= to
      ).length
    ).toBe(1)
  })

  it('should not verify withdrawal via oracle if recoveredAddress not in ORACLE_ADDRESSES_ALLOWLIST', async () => {
    mockEthServer(
      oracleValidatorExitRequestEventsMock(),
      config.EXECUTION_NODE[0]
    )
    mockEthServer(
      oracleSubmitReportDataTransactionMock(),
      config.EXECUTION_NODE[0]
    )
    mockEthServer(oracleSubmitReportTransactionMock(), config.EXECUTION_NODE[0])
    mockEthServer(oracleConsensusReachedEventsMock(), config.EXECUTION_NODE[0])

    config.ORACLE_ADDRESSES_ALLOWLIST = ['0x222']
    config.SUBMIT_TX_HASH_ALLOWLIST = []
    mockService()

    const res = await api.fetcher.getLogs(123, 123, scope())

    expect(res.length).toBe(0)
  })

  it('should verify a real Hoodi submitExitRequestsData transaction', async () => {
    mockEthServer(
      hoodiValidatorExitRequestEventsMock(),
      config.EXECUTION_NODE[0]
    )
    mockEthServer(
      hoodiSubmitExitRequestsDataTransactionMock(),
      config.EXECUTION_NODE[0]
    )

    config.ORACLE_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = [HOODI_SUBMIT_EXIT_REQUESTS_DATA_TX]
    mockService([HOODI_EXIT_VALIDATOR_INDEX])

    const res = await api.fetcher.getLogs(1621365, 1621365, scope([38]))

    expect(res).toHaveLength(1)
    expect(res[0].validatorIndex).toBe(HOODI_EXIT_VALIDATOR_INDEX)
    expect(res[0].validatorPubkey).toBe(HOODI_EXIT_VALIDATOR_PUBKEY)
  })

  it('should ignore submitExitRequestsData transaction not in allowlist', async () => {
    mockEthServer(
      hoodiValidatorExitRequestEventsMock(),
      config.EXECUTION_NODE[0]
    )
    mockEthServer(
      hoodiSubmitExitRequestsDataTransactionMock(),
      config.EXECUTION_NODE[0]
    )

    config.ORACLE_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = []
    mockService([HOODI_EXIT_VALIDATOR_INDEX])

    const res = await api.fetcher.getLogs(1621365, 1621365, scope([38]))

    expect(res).toHaveLength(0)
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Event security check failed for'),
      expect.objectContaining({
        message:
          '[verifySubmitExitRequestsDataTransaction] transaction is not allowlisted',
      })
    )
  })

  it('should reject calldata changed by the RPC provider', async () => {
    const tamperedInput = HOODI_SUBMIT_EXIT_REQUESTS_DATA_INPUT.replace(
      HOODI_EXIT_VALIDATOR_PUBKEY.slice(2),
      '00'.repeat(48)
    )

    mockEthServer(
      hoodiValidatorExitRequestEventsMock(),
      config.EXECUTION_NODE[0]
    )
    mockEthServer(
      hoodiSubmitExitRequestsDataTransactionMock({ input: tamperedInput }),
      config.EXECUTION_NODE[0]
    )

    config.ORACLE_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = [HOODI_SUBMIT_EXIT_REQUESTS_DATA_TX]
    mockService([HOODI_EXIT_VALIDATOR_INDEX])

    const res = await api.fetcher.getLogs(1621365, 1621365, scope([38]))

    expect(res).toHaveLength(0)
    expect(logger.error).toHaveBeenCalledWith(
      '[verifyTransactionIntegrity] Transaction hash mismatch detected',
      {
        computedHash: expect.any(String),
        expectedHash: HOODI_SUBMIT_EXIT_REQUESTS_DATA_TX,
      }
    )
  })

  it('should reject event pubkey missing from authenticated calldata', async () => {
    const forgedPubkey = `0x${'11'.repeat(48)}`
    mockEthServer(
      hoodiValidatorExitRequestEventsMock(forgedPubkey),
      config.EXECUTION_NODE[0]
    )
    mockEthServer(
      hoodiSubmitExitRequestsDataTransactionMock(),
      config.EXECUTION_NODE[0]
    )

    config.ORACLE_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = [HOODI_SUBMIT_EXIT_REQUESTS_DATA_TX]
    mockService([HOODI_EXIT_VALIDATOR_INDEX])

    const res = await api.fetcher.getLogs(1621365, 1621365, scope([38]))

    expect(res).toHaveLength(0)
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Event security check failed for'),
      expect.objectContaining({
        message:
          '[verifySubmitExitRequestsDataTransaction] Pubkey for exit was not found in finalized tx data',
      })
    )
  })

  it('should not verify withdrawal if validator pubkey not found on CL', async () => {
    const validatorExitRequestEvents = mockEthServer(
      hoodiValidatorExitRequestEventsMock(),
      config.EXECUTION_NODE[0]
    )

    mockService([])
    api.verifier.verifyEvent = vi.fn().mockResolvedValue(undefined)

    const res = await api.fetcher.getLogs(1621365, 1621365, scope([38]))

    expect(validatorExitRequestEvents.isDone()).to.be.true
    expect(res.length).toBe(0)
    expect(api.verifier.verifyEvent).not.toHaveBeenCalled()
  })
})
