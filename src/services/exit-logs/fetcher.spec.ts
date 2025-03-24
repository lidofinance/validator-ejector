import { ExitLogsService, makeExitLogsService } from './service.js'
import { LoggerService, RequestService, makeRequest } from '../../lib/index.js'
import {
  logsMock,
  txFirstVerificationMock,
  txSecondVerificationMock,
  logsSecurityMock,
} from './fixtures.js'
import { mockEthServer } from '../../test/mock-eth-server.js'
import { mockLogger } from '../../test/logger.js'
import { mockConfig } from '../../test/config.js'
import { ConfigService } from '../config/service.js'
import { MetricsService } from 'services/prom/service.js'
import { makeExecutionApi } from '../execution-api/service.js'

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
      get: vi.fn(() => '0x0'),
    })

    Object.defineProperty(executionApi, 'consensusAddress', {
      get: vi.fn(() => '0x0'),
    })

    api = makeExitLogsService(request, logger, executionApi, config, metrics)
  }

  beforeEach(() => {
    request = makeRequest([])
    logger = mockLogger()
    config = mockConfig(logger, {
      EXECUTION_NODE: 'http://localhost:4455',
    })
    mockService()
  })

  it('should fetch and parse logs without security', async () => {
    mockEthServer(logsMock(), config.EXECUTION_NODE)

    config.DISABLE_SECURITY_DONT_USE_IN_PRODUCTION = true
    mockService()

    const res = await api.fetcher.logs(123, 123, [1])

    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
    expect(metrics.eventSecurityVerification.inc).toBeCalledTimes(0)
  })

  it('should fetch and parse logs with security', async () => {
    mockEthServer(logsMock(), config.EXECUTION_NODE)
    mockEthServer(txFirstVerificationMock(), config.EXECUTION_NODE)
    mockEthServer(txSecondVerificationMock(), config.EXECUTION_NODE)
    mockEthServer(logsSecurityMock(), config.EXECUTION_NODE)

    config.ORACLE_ADDRESSES_ALLOWLIST = [
      '0x7eE534a6081d57AFB25b5Cff627d4D26217BB0E9',
    ]
    mockService()

    const res = await api.fetcher.logs(123, 123, [1])

    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
    expect(metrics.eventSecurityVerification.inc).toBeCalledTimes(1)
  })
})
