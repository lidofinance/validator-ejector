import { ExecutionApiService, makeExecutionApi } from './service.js'
import { LoggerService, RequestService, makeRequest } from 'lido-nanolib'
import { lastBlockNumberMock, syncingMock } from './fixtures.js'
import { mockCLServer } from '../../test/cl-server.js'
import { mockLogger } from '../../test/logger.js'
import { mockConfig } from '../../test/config.js'
import { ConfigService } from '../config/service.js'
import { MetricsService } from 'services/prom/service.js'

describe('makeConsensusApi', () => {
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
    config = mockConfig(logger, { EXECUTION_NODE: 'http://localhost:4455' })
    api = makeExecutionApi(request, logger, config, metrics)
  })

  it('should fetch syncing status', async () => {
    mockCLServer(syncingMock(), config.EXECUTION_NODE)

    const res = await api.syncing()

    expect(res).toBe(true)
  })

  //   it('should fetch genesis data', async () => {
  //     mockCLServer(lastBlockNumberMock(), config.EXECUTION_NODE)

  //     const res = await api.latestBlockNumber()

  //     expect(res).toEqual(lastBlockNumberMock().result)
  //   })

  //   it('should fetch state data', async () => {
  //     mockCLServer(stateMock(), config)

  //     const res = await api.state()

  //     expect(res).toEqual(stateMock().result.data)
  //   })

  //   it('should fetch validator info', async () => {
  //     const id = '1'
  //     const mock = validatorInfoMock(id)
  //     mockCLServer(mock, config)

  //     const res = await api.validatorInfo(id)

  //     expect(res).toEqual({
  //       index: mock.result.data.index,
  //       pubKey: mock.result.data.validator.pubkey,
  //       status: mock.result.data.status,
  //       isExiting: false,
  //     })
  //   })

  //   it('should send exit request', async () => {
  //     const message = {
  //       message: {
  //         epoch: '1',
  //         validator_index: '1',
  //       },
  //       signature: '1',
  //     }
  //     mockCLServer(exitRequestMock(), config)

  //     await api.exitRequest(message)

  //     // Since exitRequest doesn't return a value, we simply check that no error is thrown
  //     expect(true).toBe(true)
  //   })
})
