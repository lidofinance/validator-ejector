import { ExitLogsService, makeExitLogsService } from './service.js'
import { LoggerService, RequestService, makeRequest } from '../../lib/index.js'
import { ConsensusApiService } from '../consensus-api/service.js'
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
  voteSubmitHashTransactionMock,
  voteSubmitHashTransactionWithWrongHashMock,
  legacySubmitHashTransactionMock,
  legacySubmitHashTransactionMissingGasPriceMock,
  legacyEasyTrackMotionCreateTransactionMock,
  legacyEasyTrackMotionCreateTransactionMissingGasPriceMock,
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

  const mockService = (validatorIndices: string[] = ['351636']) => {
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
      config.EXECUTION_NODE
    )
    const votingValidatorExitRequestEvents = mockEthServer(
      votingValidatorExitRequestEventsMock(),
      config.EXECUTION_NODE
    )

    config.TRUST_MODE = true
    mockService()

    const motionCreatedEvents = {
      '1': '0xa2074472dfd9a1d2040e907e33473d8e660ca99ea50d98d1838ca97cc9233d26',
    }
    const votingRequestsHashSubmittedEvents = {}
    const motionEnactedEvents = {}
    const res = await api.fetcher.getLogs(
      123,
      123,
      [1],
      motionCreatedEvents,
      votingRequestsHashSubmittedEvents,
      motionEnactedEvents
    )

    expect(oracleValidatorExitRequestEvents.isDone()).to.be.true
    expect(votingValidatorExitRequestEvents.isDone()).to.be.false
    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
    expect(metrics.eventSecurityVerification.inc).toBeCalledTimes(0)
  })

  it('should verify withdrawal via oracle withdrawal events if recoveredAddress in ORACLE_ADDRESSES_ALLOWLIST', async () => {
    mockEthServer(oracleValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      oracleSubmitReportDataTransactionMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(oracleSubmitReportTransactionMock(), config.EXECUTION_NODE)
    mockEthServer(oracleConsensusReachedEventsMock(), config.EXECUTION_NODE)

    config.ORACLE_ADDRESSES_ALLOWLIST = [
      '0x7eE534a6081d57AFB25b5Cff627d4D26217BB0E9',
    ]
    config.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = []
    mockService()

    const motionCreatedEvents = {
      '1': '0xa2074472dfd9a1d2040e907e33473d8e660ca99ea50d98d1838ca97cc9233d26',
    }
    const votingRequestsHashSubmittedEvents = {}
    const motionEnactedEvents = {}
    const res = await api.fetcher.getLogs(
      123,
      123,
      [1],
      motionCreatedEvents,
      votingRequestsHashSubmittedEvents,
      motionEnactedEvents
    )

    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
  })

  it('should not verify withdrawal via oracle if recoveredAddress not in ORACLE_ADDRESSES_ALLOWLIST', async () => {
    mockEthServer(oracleValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      oracleSubmitReportDataTransactionMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(oracleSubmitReportTransactionMock(), config.EXECUTION_NODE)
    mockEthServer(oracleConsensusReachedEventsMock(), config.EXECUTION_NODE)

    config.ORACLE_ADDRESSES_ALLOWLIST = ['0x222']
    config.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = []
    mockService()

    const motionCreatedEvents = {
      '1': '0xa2074472dfd9a1d2040e907e33473d8e660ca99ea50d98d1838ca97cc9233d26',
    }
    const votingRequestsHashSubmittedEvents = {}
    const motionEnactedEvents = {}
    const res = await api.fetcher.getLogs(
      123,
      123,
      [1],
      motionCreatedEvents,
      votingRequestsHashSubmittedEvents,
      motionEnactedEvents
    )

    expect(res.length).toBe(0)
  })

  it('should verify withdrawal via vote successfully when transaction in SUBMIT_TX_HASH_ALLOWLIST', async () => {
    mockEthServer(votingValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      votingSubmitExitRequestsDataTransactionMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(voteSubmitHashTransactionMock(), config.EXECUTION_NODE)

    config.ORACLE_ADDRESSES_ALLOWLIST = []
    config.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = [
      '0x32f6af0779f3f8f8286e4dccfacfe2eb0b073d1be0dffaf7b484b5aee87a6478',
    ]
    mockService()

    const motionCreatedEvents = {}
    const votingRequestsHashSubmittedEvents = {
      '0xbf69f106a2ad7915a01b4c49d4ce14c0bcf8d221dbe214a957863b5a29c301ac':
        '0x32f6af0779f3f8f8286e4dccfacfe2eb0b073d1be0dffaf7b484b5aee87a6478',
    }
    const motionEnactedEvents = {}
    const res = await api.fetcher.getLogs(
      123,
      123,
      [1],
      motionCreatedEvents,
      votingRequestsHashSubmittedEvents,
      motionEnactedEvents
    )

    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
  })

  it('should throw transaction hash mismatch error when verifying transaction integrity when SUBMIT_TX_HASH_ALLOWLIST used', async () => {
    mockEthServer(votingValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      votingSubmitExitRequestsDataTransactionMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(
      voteSubmitHashTransactionWithWrongHashMock(),
      config.EXECUTION_NODE
    )

    config.ORACLE_ADDRESSES_ALLOWLIST = []
    config.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = [
      '0xtestf0779f3f8f8286e4dccfacfe2eb0b073d1be0dffaf7b484b5aee87a6478',
    ]
    mockService()

    const motionCreatedEvents = {}
    const votingRequestsHashSubmittedEvents = {
      '0xbf69f106a2ad7915a01b4c49d4ce14c0bcf8d221dbe214a957863b5a29c301ac':
        '0xtestf0779f3f8f8286e4dccfacfe2eb0b073d1be0dffaf7b484b5aee87a6478',
    }
    const motionEnactedEvents = {}

    const loggerErrorSpy = vi.spyOn(logger, 'error')

    const res = await api.fetcher.getLogs(
      123,
      123,
      [1],
      motionCreatedEvents,
      votingRequestsHashSubmittedEvents,
      motionEnactedEvents
    )

    expect(res.length).toBe(0)
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      '[verifyTransactionIntegrity] Transaction hash mismatch detected',
      expect.objectContaining({
        computedHash: expect.any(String),
        expectedHash: expect.any(String),
      })
    )
  })

  it('should verify withdrawal via vote successfully when transaction in EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST', async () => {
    mockEthServer(votingValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      votingSubmitExitRequestsDataTransactionMock(),
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

    const motionCreatedEvents = {
      '1': '0xa2074472dfd9a1d2040e907e33473d8e660ca99ea50d98d1838ca97cc9233d26',
    }
    const votingRequestsHashSubmittedEvents = {
      '0xbf69f106a2ad7915a01b4c49d4ce14c0bcf8d221dbe214a957863b5a29c301ac':
        '0xe5b1eb2f6bb114961125040d7341bc09c179ca96b85b1c1a774ef772c7567ccd',
    }
    const motionEnactedEvents = {
      '0xe5b1eb2f6bb114961125040d7341bc09c179ca96b85b1c1a774ef772c7567ccd': '1',
    }
    const res = await api.fetcher.getLogs(
      123,
      123,
      [1],
      motionCreatedEvents,
      votingRequestsHashSubmittedEvents,
      motionEnactedEvents
    )

    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
  })

  it('should not verify withdrawal via vote when transaction not in EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST and not in SUBMIT_TX_HASH_ALLOWLIST', async () => {
    mockEthServer(votingValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      votingSubmitExitRequestsDataTransactionMock(),
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

    const motionCreatedEvents = {
      '1': '0xa2074472dfd9a1d2040e907e33473d8e660ca99ea50d98d1838ca97cc9233d26',
    }
    const votingRequestsHashSubmittedEvents = {}
    const motionEnactedEvents = {}
    const res = await api.fetcher.getLogs(
      123,
      123,
      [1],
      motionCreatedEvents,
      votingRequestsHashSubmittedEvents,
      motionEnactedEvents
    )

    expect(res.length).toBe(0)
  })

  it('should not verify withdrawal via vote when EASY_TRACK_ADDRESS is empty', async () => {
    const votingValidatorExitRequestEvents = mockEthServer(
      votingValidatorExitRequestEventsMock(),
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

    const res = await api.fetcher.getLogs(123, 123, [1], {}, {}, {})

    expect(votingValidatorExitRequestEvents.isDone()).to.be.true
    expect(res.length).toBe(0)
  })

  it('should not verify withdrawal if validator pubkey not found on CL', async () => {
    const votingValidatorExitRequestEvents = mockEthServer(
      votingValidatorExitRequestEventsMock(),
      config.EXECUTION_NODE
    )

    config.EASY_TRACK_ADDRESS = ''
    mockService([])
    api.verifier.verifyEvent = vi.fn().mockResolvedValue(undefined)

    const res = await api.fetcher.getLogs(123, 123, [1], {}, {}, {})

    expect(votingValidatorExitRequestEvents.isDone()).to.be.true
    expect(res.length).toBe(0)
    expect(api.verifier.verifyEvent).not.toHaveBeenCalled()
  })

  it('should fetch motion created events correctly', async () => {
    const easyTrackMotionCreatedEvents = mockEthServer(
      easyTrackMotionCreatedEventsMock(),
      config.EXECUTION_NODE
    )

    config.EASY_TRACK_ADDRESS = '0x0000000000000000000000000000000000000000'
    mockService()

    const motionEvents = await api.fetcher.getMotionCreatedEvents(123, 123)

    expect(easyTrackMotionCreatedEvents.isDone()).to.be.true
    expect(motionEvents).toEqual({
      '1': '0xa2074472dfd9a1d2040e907e33473d8e660ca99ea50d98d1838ca97cc9233d26',
    })
  })

  it('should return empty object when EASY_TRACK_ADDRESS is not set', async () => {
    const easyTrackMotionCreatedEvents = mockEthServer(
      easyTrackMotionCreatedEventsMock(),
      config.EXECUTION_NODE
    )

    config.EASY_TRACK_ADDRESS = ''
    mockService()

    const motionEvents = await api.fetcher.getMotionCreatedEvents(123, 123)

    expect(easyTrackMotionCreatedEvents.isDone()).to.be.false
    expect(motionEvents).toEqual({})
  })

  describe('getVotingRequestsHashSubmittedEvents', () => {
    it('should fetch and parse voting requests hash submitted events', async () => {
      const votingRequestsHashSubmittedEvents = mockEthServer(
        votingRequestsHashSubmittedEventsMock(),
        config.EXECUTION_NODE
      )

      mockService()

      const result = await api.fetcher.getVotingRequestsHashSubmittedEvents(
        123,
        123
      )

      expect(votingRequestsHashSubmittedEvents.isDone()).to.be.true
      expect(result).toEqual({
        '0xbf69f106a2ad7915a01b4c49d4ce14c0bcf8d221dbe214a957863b5a29c301ac':
          '0xe5b1eb2f6bb114961125040d7341bc09c179ca96b85b1c1a774ef772c7567ccd',
      })
    })
  })

  describe('getMotionEnactedEvents', () => {
    it('should fetch and parse motion enacted events', async () => {
      const easyTrackMotionEnactedEvents = mockEthServer(
        easyTrackMotionEnactedEventsMock(),
        config.EXECUTION_NODE
      )

      mockService()

      const result = await api.fetcher.getMotionEnactedEvents(123, 123)

      expect(easyTrackMotionEnactedEvents.isDone()).to.be.true
      expect(result).toEqual({
        '0xe5b1eb2f6bb114961125040d7341bc09c179ca96b85b1c1a774ef772c7567ccd':
          '1',
      })
    })

    it('should return empty object when EASY_TRACK_ADDRESS is not set', async () => {
      config.EASY_TRACK_ADDRESS = ''
      mockService()

      const result = await api.fetcher.getMotionEnactedEvents(123, 123)

      expect(result).toEqual({})
    })
  })

  it('should verify legacy transaction successfully when transaction in SUBMIT_TX_HASH_ALLOWLIST', async () => {
    mockEthServer(votingValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      votingSubmitExitRequestsDataTransactionMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(legacySubmitHashTransactionMock(), config.EXECUTION_NODE)

    config.ORACLE_ADDRESSES_ALLOWLIST = []
    config.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = [
      '0x2802b350ef8a88114b8f6a3251125dd3c925a44faf5c8cf3f7fb5b200ec5a3ce',
    ]
    mockService()

    const motionCreatedEvents = {}
    const votingRequestsHashSubmittedEvents = {
      '0xbf69f106a2ad7915a01b4c49d4ce14c0bcf8d221dbe214a957863b5a29c301ac':
        '0x2802b350ef8a88114b8f6a3251125dd3c925a44faf5c8cf3f7fb5b200ec5a3ce',
    }
    const motionEnactedEvents = {}
    const res = await api.fetcher.getLogs(
      123,
      123,
      [1],
      motionCreatedEvents,
      votingRequestsHashSubmittedEvents,
      motionEnactedEvents
    )

    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
  })

  it('should not verify when legacy transaction missing gasPrice', async () => {
    mockEthServer(votingValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      votingSubmitExitRequestsDataTransactionMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(
      legacySubmitHashTransactionMissingGasPriceMock(),
      config.EXECUTION_NODE
    )

    config.ORACLE_ADDRESSES_ALLOWLIST = []
    config.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST = []
    config.SUBMIT_TX_HASH_ALLOWLIST = [
      '0x2802b350ef8a88114b8f6a3251125dd3c925a44faf5c8cf3f7fb5b200ec5a3ce',
    ]
    mockService()

    const motionCreatedEvents = {}
    const votingRequestsHashSubmittedEvents = {
      '0xbf69f106a2ad7915a01b4c49d4ce14c0bcf8d221dbe214a957863b5a29c301ac':
        '0x2802b350ef8a88114b8f6a3251125dd3c925a44faf5c8cf3f7fb5b200ec5a3ce',
    }
    const motionEnactedEvents = {}

    const loggerErrorSpy = vi.spyOn(logger, 'error')

    const res = await api.fetcher.getLogs(
      123,
      123,
      [1],
      motionCreatedEvents,
      votingRequestsHashSubmittedEvents,
      motionEnactedEvents
    )

    expect(res.length).toBe(0)
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Event security check failed for'),
      expect.objectContaining({
        message:
          '[validateTransactionType] Legacy transaction missing gasPrice',
      })
    )
  })

  it('should verify withdrawal via Easy Track motion successfully when legacy transaction with recoverAddress', async () => {
    mockEthServer(votingValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      votingSubmitExitRequestsDataTransactionMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(
      legacyEasyTrackMotionCreateTransactionMock(),
      config.EXECUTION_NODE
    )

    config.ORACLE_ADDRESSES_ALLOWLIST = []
    config.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST = [
      '0xD23C5258cEeD5Adf06713A7A21930F339F57c836',
    ]
    config.SUBMIT_TX_HASH_ALLOWLIST = []
    mockService()

    const motionCreatedEvents = {
      '1': '0xa2074472dfd9a1d2040e907e33473d8e660ca99ea50d98d1838ca97cc9233d26',
    }
    const votingRequestsHashSubmittedEvents = {
      '0xbf69f106a2ad7915a01b4c49d4ce14c0bcf8d221dbe214a957863b5a29c301ac':
        '0xe5b1eb2f6bb114961125040d7341bc09c179ca96b85b1c1a774ef772c7567ccd',
    }
    const motionEnactedEvents = {
      '0xe5b1eb2f6bb114961125040d7341bc09c179ca96b85b1c1a774ef772c7567ccd': '1',
    }
    const res = await api.fetcher.getLogs(
      123,
      123,
      [1],
      motionCreatedEvents,
      votingRequestsHashSubmittedEvents,
      motionEnactedEvents
    )

    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
  })

  it('should not verify withdrawal via Easy Track when legacy transaction missing gasPrice in recoverAddress', async () => {
    mockEthServer(votingValidatorExitRequestEventsMock(), config.EXECUTION_NODE)
    mockEthServer(
      votingSubmitExitRequestsDataTransactionMock(),
      config.EXECUTION_NODE
    )
    mockEthServer(
      legacyEasyTrackMotionCreateTransactionMissingGasPriceMock(),
      config.EXECUTION_NODE
    )

    config.ORACLE_ADDRESSES_ALLOWLIST = []
    config.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST = [
      '0xD23C5258cEeD5Adf06713A7A21930F339F57c836',
    ]
    config.SUBMIT_TX_HASH_ALLOWLIST = []
    mockService()

    const motionCreatedEvents = {
      '1': '0xa2074472dfd9a1d2040e907e33473d8e660ca99ea50d98d1838ca97cc9233d26',
    }
    const votingRequestsHashSubmittedEvents = {
      '0xbf69f106a2ad7915a01b4c49d4ce14c0bcf8d221dbe214a957863b5a29c301ac':
        '0xe5b1eb2f6bb114961125040d7341bc09c179ca96b85b1c1a774ef772c7567ccd',
    }
    const motionEnactedEvents = {
      '0xe5b1eb2f6bb114961125040d7341bc09c179ca96b85b1c1a774ef772c7567ccd': '1',
    }

    const loggerErrorSpy = vi.spyOn(logger, 'error')

    const res = await api.fetcher.getLogs(
      123,
      123,
      [1],
      motionCreatedEvents,
      votingRequestsHashSubmittedEvents,
      motionEnactedEvents
    )

    expect(res.length).toBe(0)
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Event security check failed for'),
      expect.objectContaining({
        message:
          '[validateTransactionType] Legacy transaction missing gasPrice',
      })
    )
  })
})
