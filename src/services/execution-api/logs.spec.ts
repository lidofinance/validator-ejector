import { ExecutionApiService, makeExecutionApi } from './service.js'
import { LoggerService, RequestService, makeRequest } from 'lido-nanolib'
import {
  logsMock,
  txFirstVerificationMock,
  txSecondVerificationMock,
  logsSecurityMock,
} from './fixtures.js'
import { mockCLServer } from '../../test/cl-server.js'
import { mockLogger } from '../../test/logger.js'
import { mockConfig } from '../../test/config.js'
import { ConfigService } from '../config/service.js'
import { MetricsService } from 'services/prom/service.js'

describe('makeConsensusApi logs', () => {
  let api: ExecutionApiService
  let request: RequestService
  let logger: LoggerService
  let config: ConfigService

  const metrics = {
    eventSecurityVerification: {
      inc: vi.fn(),
    },
  } as unknown as MetricsService

  beforeEach(() => {
    request = makeRequest([])
    logger = mockLogger()
    config = mockConfig(logger, {
      EXECUTION_NODE: 'http://localhost:4455',
    })
    api = makeExecutionApi(request, logger, config, metrics)
  })

  it('should fetch and parse logs without security', async () => {
    mockCLServer(logsMock(), config.EXECUTION_NODE)

    config.DISABLE_SECURITY_DONT_USE_IN_PRODUCTION = true
    api = makeExecutionApi(request, logger, config, metrics)

    const res = await api.logs(123, 123)

    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
    expect(metrics.eventSecurityVerification.inc).toBeCalledTimes(0)
  })

  it('should fetch and parse logs with security', async () => {
    mockCLServer(logsMock(), config.EXECUTION_NODE)
    mockCLServer(txFirstVerificationMock(), config.EXECUTION_NODE)
    mockCLServer(txSecondVerificationMock(), config.EXECUTION_NODE)
    mockCLServer(logsSecurityMock(), config.EXECUTION_NODE)

    config.ORACLE_ADDRESSES_ALLOWLIST = [
      '0x7eE534a6081d57AFB25b5Cff627d4D26217BB0E9',
    ]
    api = makeExecutionApi(request, logger, config, metrics)

    const res = await api.logs(123, 123)

    expect(res.length).toBe(1)
    expect(res[0].validatorIndex).toBe('351636')
    expect(res[0].validatorPubkey).toBe(
      '0xab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a'
    )
    expect(metrics.eventSecurityVerification.inc).toBeCalledTimes(1)
  })
})
