import nock from 'nock'

import { ExecutionApiService, makeExecutionApi } from './service.js'
import {
  LoggerService,
  RequestService,
  makeRequest,
  notOkError,
  retry,
} from '../../lib/index.js'
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

  afterEach(() => nock.cleanAll())

  it('should fetch syncing status', async () => {
    mockEthServer(syncingMock(), config.EXECUTION_NODE[0])

    const res = await api.checkSync()

    expect(res).toBe(true)
  })

  it('should handle boolean syncing response', async () => {
    mockEthServer(syncingBooleanMock(false), config.EXECUTION_NODE[0])

    const res = await api.checkSync()

    expect(res).toBe(false)
  })

  it('should throw NodeNotSyncedError for object response when synced', async () => {
    mockEthServer(
      syncingObjectMock('0x9539a6', '0x9539a6'),
      config.EXECUTION_NODE[0]
    )

    await expect(api.checkSync()).rejects.toThrow(NodeNotSyncedError)
  })

  it('should throw NodeNotSyncedError for object response when syncing', async () => {
    mockEthServer(
      syncingObjectMock('0x9539a0', '0x9539a6'),
      config.EXECUTION_NODE[0]
    )

    await expect(api.checkSync()).rejects.toThrow(NodeNotSyncedError)
  })

  it('should fetch genesis data', async () => {
    mockEthServer(lastBlockNumberMock(), config.EXECUTION_NODE[0])

    const res = await api.latestBlockNumber()

    expect(res).toEqual(Number(lastBlockNumberMock().result.result.number))
  })

  it('should fetch locator', async () => {
    const CL_ADDR =
      '0x0000000000000000000000008374b4ac337d7e367ea1ef54bb29880c3f036a51'
    const EX_BUS_ADDR =
      '0x0000000000000000000000008374b4ac337d7e367ea1ef54bb29880c3f036a52'
    mockEthServer(funcMock(CL_ADDR), config.EXECUTION_NODE[0])
    await api.resolveConsensusAddress()

    mockEthServer(funcMock(EX_BUS_ADDR), config.EXECUTION_NODE[0])
    await api.resolveExitBusAddress()

    expect(true).toBe(true)
  })

  describe('multi-URL fallback', () => {
    const PRIMARY = 'http://primary.example:8545'
    const SECONDARY = 'http://secondary.example:8545'

    it('falls back to the next URL when the primary returns 5xx', async () => {
      const cfg = mockConfig(logger, {
        EXECUTION_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const requestWithErrors = makeRequest([notOkError()])
      const apiMulti = makeExecutionApi(requestWithErrors, logger, cfg)

      nock(PRIMARY).post('/').reply(503, 'busy')
      mockEthServer(lastBlockNumberMock(), SECONDARY)

      const res = await apiMulti.latestBlockNumber()

      expect(res).toEqual(Number(lastBlockNumberMock().result.result.number))
      expect(logger.warn).toHaveBeenCalledWith(
        'EL endpoint failed, trying next',
        expect.objectContaining({ url: 'primary.example:8545' })
      )
    })

    it('exhausts request retries on the primary before falling back', async () => {
      const cfg = mockConfig(logger, {
        EXECUTION_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const requestWithRetries = makeRequest([
        retry(2, { ignoreAbort: true, sleep: 0 }),
        notOkError(),
      ])
      const apiMulti = makeExecutionApi(requestWithRetries, logger, cfg)

      let primaryCalls = 0
      const primaryScope = nock(PRIMARY)
        .post('/')
        .times(2)
        .reply(() => {
          primaryCalls += 1
          return [503, 'busy']
        })
      nock(PRIMARY)
        .post('/')
        .reply(() => {
          primaryCalls += 1
          return [418, 'extra retry']
        })
      const secondaryScope = mockEthServer(lastBlockNumberMock(), SECONDARY)

      const res = await apiMulti.latestBlockNumber()

      expect(primaryScope.isDone()).toBe(true)
      expect(primaryCalls).toBe(2)
      expect(secondaryScope.isDone()).toBe(true)
      expect(res).toEqual(Number(lastBlockNumberMock().result.result.number))
      expect(logger.warn).toHaveBeenCalledWith(
        'EL endpoint failed, trying next',
        expect.objectContaining({ url: 'primary.example:8545' })
      )
    })

    it('does not rotate to the next URL on a 4xx (terminal) response', async () => {
      const cfg = mockConfig(logger, {
        EXECUTION_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const requestWithErrors = makeRequest([notOkError()])
      const apiMulti = makeExecutionApi(requestWithErrors, logger, cfg)

      nock(PRIMARY).post('/').reply(400, 'bad request')
      // No mock for SECONDARY — if the call rotated, nock would error
      // about an unexpected request, which is precisely the regression
      // this test guards against.

      await expect(apiMulti.latestBlockNumber()).rejects.toBeInstanceOf(Error)
      expect(logger.warn).not.toHaveBeenCalledWith(
        'EL endpoint failed, trying next',
        expect.any(Object)
      )
    })

    it('rotates on JSON-RPC error envelope (HTTP 200 + error.code -32603)', async () => {
      const cfg = mockConfig(logger, {
        EXECUTION_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const requestWithErrors = makeRequest([notOkError()])
      const apiMulti = makeExecutionApi(requestWithErrors, logger, cfg)

      nock(PRIMARY)
        .post('/')
        .reply(200, {
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32603, message: 'internal error' },
        })
      mockEthServer(lastBlockNumberMock(), SECONDARY)

      const res = await apiMulti.latestBlockNumber()

      expect(res).toEqual(Number(lastBlockNumberMock().result.result.number))
      expect(logger.warn).toHaveBeenCalledWith(
        'EL endpoint failed, trying next',
        expect.objectContaining({ url: 'primary.example:8545' })
      )
    })

    it('does not rotate on deterministic JSON-RPC errors (e.g. -32602 invalid params)', async () => {
      const cfg = mockConfig(logger, {
        EXECUTION_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const requestWithErrors = makeRequest([notOkError()])
      const apiMulti = makeExecutionApi(requestWithErrors, logger, cfg)

      nock(PRIMARY)
        .post('/')
        .reply(200, {
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32602, message: 'invalid params' },
        })
      // No mock for SECONDARY — if the call rotated, nock would error.

      // The response will pass through to the DTO, which will throw a
      // ValidationError trying to read `result`.
      await expect(apiMulti.latestBlockNumber()).rejects.toBeInstanceOf(Error)
      expect(logger.warn).not.toHaveBeenCalledWith(
        'EL endpoint failed, trying next',
        expect.any(Object)
      )
    })
  })
})
