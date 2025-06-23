import { ExitLogsService, makeExitLogsService } from './service.js'
import { LoggerService, RequestService, makeRequest } from '../../lib/index.js'
import {
  oracleValidatorExitRequestEventsMock,
  oracleSubmitReportDataTransactionMock,
  oracleSubmitReportTransactionMock,
  oracleConsensusReachedEventsMock,
  votingRequestsHashSubmittedEventsMock,
  easyTrackMotionCreatedEventsMock,
  easyTrackMotionEnactedEventsMock,
  votingValidatorExitRequestEventsMock,
  votingSubmitExitRequestsDataTransactionMock,
  voteEasyTrackMotionCreateTransactionMock,
} from './fixtures.js'
import { mockEthServer } from '../../test/mock-eth-server.js'
import { mockLogger } from '../../test/logger.js'
import { mockConfig } from '../../test/config.js'
import { ConfigService } from '../config/service.js'
import { MetricsService } from 'services/prom/service.js'
import { makeExecutionApi } from '../execution-api/service.js'
import nock from 'nock'

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

  const mockService = () => {
    const executionApi = makeExecutionApi(request, logger, config)

    Object.defineProperty(executionApi, 'exitBusAddress', {
      get: vi.fn(() => '0x0000000000000000000000000000000000000000'),
    })

    Object.defineProperty(executionApi, 'consensusAddress', {
      get: vi.fn(() => '0x0000000000000000000000000000000000000000'),
    })

    Object.defineProperty(executionApi, 'easyTrackAddress', {
      get: vi.fn(() => '0x0000000000000000000000000000000000000000'),
    })

    api = makeExitLogsService(logger, executionApi, config, metrics)
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
      config.EXECUTION_NODE
    )
    const votingValidatorExitRequestEvents = mockEthServer(
      votingValidatorExitRequestEventsMock(),
      config.EXECUTION_NODE
    )
    const easyTrackMotionCreatedEvents = mockEthServer(
      easyTrackMotionCreatedEventsMock(),
      config.EXECUTION_NODE
    )
    const easyTrackMotionEnactedEvents = mockEthServer(
      easyTrackMotionEnactedEventsMock(),
      config.EXECUTION_NODE
    )
    const votingRequestsHashSubmittedEvents = mockEthServer(
      votingRequestsHashSubmittedEventsMock(),
      config.EXECUTION_NODE
    )

    config.TRUST_MODE = true
    mockService()

    const res = await api.fetcher.getLogs(123, 123, [1])

    expect(oracleValidatorExitRequestEvents.isDone()).to.be.true
    expect(votingValidatorExitRequestEvents.isDone()).to.be.false
    expect(easyTrackMotionCreatedEvents.isDone()).to.be.false
    expect(easyTrackMotionEnactedEvents.isDone()).to.be.false
    expect(votingRequestsHashSubmittedEvents.isDone()).to.be.false
    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
    expect(metrics.eventSecurityVerification.inc).toBeCalledTimes(0)
  })

  it('should verify withdrawal via oracle withdrawal events if recoveredAddress in ORACLE_ADDRESSES_ALLOWLIST', async () => {
    mockEthServer(oracleValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(easyTrackMotionCreatedEventsMock(), config.EXECUTION_NODE)
    mockEthServer(easyTrackMotionEnactedEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      oracleSubmitReportDataTransactionMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(oracleSubmitReportTransactionMock(), config.EXECUTION_NODE)
    mockEthServer(oracleConsensusReachedEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      votingRequestsHashSubmittedEventsMock(),
      config.EXECUTION_NODE
    )

    config.ORACLE_ADDRESSES_ALLOWLIST = [
      '0x7eE534a6081d57AFB25b5Cff627d4D26217BB0E9',
    ]
    config.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = []
    mockService()

    const res = await api.fetcher.getLogs(123, 123, [1])

    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
  })

  it('should not verify withdrawal via oracle if recoveredAddress not in ORACLE_ADDRESSES_ALLOWLIST', async () => {
    mockEthServer(oracleValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(easyTrackMotionCreatedEventsMock(), config.EXECUTION_NODE)
    mockEthServer(easyTrackMotionEnactedEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      oracleSubmitReportDataTransactionMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(oracleSubmitReportTransactionMock(), config.EXECUTION_NODE)
    mockEthServer(oracleConsensusReachedEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      votingRequestsHashSubmittedEventsMock(),
      config.EXECUTION_NODE
    )

    config.ORACLE_ADDRESSES_ALLOWLIST = ['0x222']
    config.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = []
    mockService()

    const res = await api.fetcher.getLogs(123, 123, [1])

    expect(res.length).toBe(0)
  })

  it('should verify withdrawal via vote successfully when transaction in SUBMIT_TX_HASH_ALLOWLIST', async () => {
    mockEthServer(votingValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(easyTrackMotionCreatedEventsMock(), config.EXECUTION_NODE)
    mockEthServer(easyTrackMotionEnactedEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      votingSubmitExitRequestsDataTransactionMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(
      votingRequestsHashSubmittedEventsMock(),
      config.EXECUTION_NODE
    )

    config.ORACLE_ADDRESSES_ALLOWLIST = []
    config.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = [
      '0xe5b1eb2f6bb114961125040d7341bc09c179ca96b85b1c1a774ef772c7567ccd',
    ]
    mockService()

    const res = await api.fetcher.getLogs(123, 123, [1])

    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
  })

  it('should verify withdrawal via vote successfully when transaction in EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST', async () => {
    mockEthServer(votingValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(easyTrackMotionCreatedEventsMock(), config.EXECUTION_NODE)
    mockEthServer(easyTrackMotionEnactedEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      votingSubmitExitRequestsDataTransactionMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(
      votingRequestsHashSubmittedEventsMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(
      voteEasyTrackMotionCreateTransactionMock(),
      config.EXECUTION_NODE
    )

    config.ORACLE_ADDRESSES_ALLOWLIST = []
    config.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST = [
      '0xfAd931F268dc5f8E5cdc3000baAaC0cbdb4E0a9C',
    ]
    config.SUBMIT_TX_HASH_ALLOWLIST = []
    mockService()

    const res = await api.fetcher.getLogs(123, 123, [1])

    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
  })

  it('should not verify withdrawal via vote when transaction not in EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST and not in SUBMIT_TX_HASH_ALLOWLIST', async () => {
    mockEthServer(votingValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(easyTrackMotionCreatedEventsMock(), config.EXECUTION_NODE)
    mockEthServer(easyTrackMotionEnactedEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      votingSubmitExitRequestsDataTransactionMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(
      votingRequestsHashSubmittedEventsMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(
      voteEasyTrackMotionCreateTransactionMock(),
      config.EXECUTION_NODE
    )

    config.ORACLE_ADDRESSES_ALLOWLIST = []
    config.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = []
    mockService()

    const res = await api.fetcher.getLogs(123, 123, [1])

    expect(res.length).toBe(0)
  })

  it('should not verify withdrawal via vote when EASY_TRACK_ADDRESS is empty', async () => {
    const votingValidatorExitRequestEvents = mockEthServer(
      votingValidatorExitRequestEventsMock(),
      config.EXECUTION_NODE
    )
    const easyTrackMotionCreatedEvents = mockEthServer(
      easyTrackMotionCreatedEventsMock(),
      config.EXECUTION_NODE
    )
    const easyTrackMotionEnactedEvents = mockEthServer(
      easyTrackMotionEnactedEventsMock(),
      config.EXECUTION_NODE
    )
    const votingRequestsHashSubmittedEvents = mockEthServer(
      votingRequestsHashSubmittedEventsMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(
      votingSubmitExitRequestsDataTransactionMock(),
      config.EXECUTION_NODE
    )

    mockEthServer(
      voteEasyTrackMotionCreateTransactionMock(),
      config.EXECUTION_NODE
    )

    config.EASY_TRACK_ADDRESS = ''
    mockService()

    const res = await api.fetcher.getLogs(123, 123, [1])

    expect(votingValidatorExitRequestEvents.isDone()).to.be.true
    expect(easyTrackMotionCreatedEvents.isDone()).to.be.false
    expect(easyTrackMotionEnactedEvents.isDone()).to.be.false
    expect(votingRequestsHashSubmittedEvents.isDone()).to.be.false
    expect(res.length).toBe(0)
  })
})
