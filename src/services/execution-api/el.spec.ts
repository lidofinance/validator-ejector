import { ExecutionApiService, makeExecutionApi } from './service.js'
import { LoggerService, RequestService, makeRequest } from '../../lib/index.js'
import {
  funcMock,
  lastBlockNumberMock,
  syncingMock,
  syncingBooleanMock,
  syncingObjectMock,
} from './fixtures.js'
import { mockEthServer } from '../../test/mock-eth-server.js'
import { mockLogger } from '../../test/logger.js'
import { mockConfig } from '../../test/config.js'
import { ConfigService } from '../config/service.js'
import { NodeNotSyncedError } from './errors.js'

describe('makeExecutionApi', () => {
  let api: ExecutionApiService
  let request: RequestService
  let logger: LoggerService
  let config: ConfigService

  beforeEach(() => {
    request = makeRequest([])
    logger = mockLogger()
    config = mockConfig(logger, { EXECUTION_NODE: 'http://localhost:4455' })
    api = makeExecutionApi(request, logger, config)
  })

  it('should fetch syncing status', async () => {
    mockEthServer(syncingMock(), config.EXECUTION_NODE)

    const res = await api.checkSync()

    expect(res).toBe(true)
  })

  it('should handle boolean syncing response', async () => {
    mockEthServer(syncingBooleanMock(false), config.EXECUTION_NODE)

    const res = await api.checkSync()

    expect(res).toBe(false)
  })

  it('should throw NodeNotSyncedError for object response when synced', async () => {
    mockEthServer(
      syncingObjectMock('0x9539a6', '0x9539a6'),
      config.EXECUTION_NODE
    )

    await expect(api.checkSync()).rejects.toThrow(NodeNotSyncedError)
  })

  it('should throw NodeNotSyncedError for object response when syncing', async () => {
    mockEthServer(
      syncingObjectMock('0x9539a0', '0x9539a6'),
      config.EXECUTION_NODE
    )

    await expect(api.checkSync()).rejects.toThrow(NodeNotSyncedError)
  })

  it('should fetch genesis data', async () => {
    mockEthServer(lastBlockNumberMock(), config.EXECUTION_NODE)

    const res = await api.latestBlockNumber()

    expect(res).toEqual(Number(lastBlockNumberMock().result.result.number))
  })

  it('should fetch locator', async () => {
    const CL_ADDR =
      '0x0000000000000000000000008374b4ac337d7e367ea1ef54bb29880c3f036a51'
    const EX_BUS_ADDR =
      '0x0000000000000000000000008374b4ac337d7e367ea1ef54bb29880c3f036a52'
    mockEthServer(funcMock(CL_ADDR), config.EXECUTION_NODE)
    await api.resolveConsensusAddress()

    mockEthServer(funcMock(EX_BUS_ADDR), config.EXECUTION_NODE)
    await api.resolveExitBusAddress()

    expect(true).toBe(true)
  })
})
