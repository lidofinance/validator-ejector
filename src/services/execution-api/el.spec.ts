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
import { JsonRpcServerError, NodeNotSyncedError } from './errors.js'

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

  describe('getLogs chunking', () => {
    const ADDRESS = '0x0De4Ea0184c2ad0BacA7183356Aea5B8d5Bf5c6e'
    const TOPIC =
      '0x96395f55c4997466e5035d777f0e1ba82b8cae217aaad05cf07839eb7c75bcf2'

    const logsReply = (blockNumber: string) => ({
      jsonrpc: '2.0',
      id: 1,
      result: [
        {
          topics: [TOPIC],
          data: '0x',
          blockNumber,
          transactionHash: '0xabc',
        },
      ],
    })

    it('splits ranges wider than LOAD_LOGS_STEP into sequential requests', async () => {
      const cfg = mockConfig(logger, {
        EXECUTION_NODE: 'http://localhost:4455',
        LOAD_LOGS_STEP: 100,
      })
      const apiChunked = makeExecutionApi(request, logger, cfg)

      const ranges: [string, string][] = []
      nock(cfg.EXECUTION_NODE[0])
        .post('/', (body: any) => body.method === 'eth_getLogs')
        .times(3)
        .reply(200, (_uri, body: any) => {
          const { fromBlock, toBlock } = body.params[0]
          ranges.push([fromBlock, toBlock])
          // Distinct event per chunk to verify nothing is lost in the merge
          const reply = logsReply(fromBlock)
          reply.result[0].transactionHash = `0xtx-${fromBlock}`
          return reply
        })

      const { result } = await apiChunked.getLogs(1, 251, ADDRESS, [TOPIC])

      expect(ranges).toEqual([
        ['0x1', '0x64'], // 1-100
        ['0x65', '0xc8'], // 101-200
        ['0xc9', '0xfb'], // 201-251
      ])
      // All chunk events survive the merge, in chunk order
      expect(result.map((log) => log.transactionHash)).toEqual([
        '0xtx-0x1',
        '0xtx-0x65',
        '0xtx-0xc9',
      ])
    })

    it('handles a single-block range as one request with equal bounds', async () => {
      const cfg = mockConfig(logger, {
        EXECUTION_NODE: 'http://localhost:4455',
        LOAD_LOGS_STEP: 100,
      })
      const apiChunked = makeExecutionApi(request, logger, cfg)

      const ranges: [string, string][] = []
      nock(cfg.EXECUTION_NODE[0])
        .post('/', (body: any) => {
          if (body.method !== 'eth_getLogs') return false
          ranges.push([body.params[0].fromBlock, body.params[0].toBlock])
          return true
        })
        .reply(200, logsReply('0x2a'))

      const { result } = await apiChunked.getLogs(42, 42, ADDRESS, [TOPIC])

      expect(ranges).toEqual([['0x2a', '0x2a']])
      expect(result).toHaveLength(1)
    })

    it('rejects on a failing middle chunk without returning a partial result', async () => {
      const cfg = mockConfig(logger, {
        EXECUTION_NODE: 'http://localhost:4455',
        LOAD_LOGS_STEP: 100,
      })
      const apiChunked = makeExecutionApi(request, logger, cfg)

      let requests = 0
      nock(cfg.EXECUTION_NODE[0])
        .post('/', (body: any) => body.method === 'eth_getLogs')
        .times(3)
        .reply(200, () => {
          requests += 1
          // Second chunk returns a malformed body that fails DTO validation
          return requests === 2 ? { unexpected: true } : logsReply('0x1')
        })

      await expect(
        apiChunked.getLogs(1, 251, ADDRESS, [TOPIC])
      ).rejects.toThrow()

      // The loop stops at the failing chunk — the third is never requested
      expect(requests).toBe(2)
    })

    it('sends a single request when the range fits into LOAD_LOGS_STEP', async () => {
      const cfg = mockConfig(logger, {
        EXECUTION_NODE: 'http://localhost:4455',
        LOAD_LOGS_STEP: 100,
      })
      const apiChunked = makeExecutionApi(request, logger, cfg)

      const ranges: [string, string][] = []
      nock(cfg.EXECUTION_NODE[0])
        .post('/', (body: any) => {
          if (body.method !== 'eth_getLogs') return false
          ranges.push([body.params[0].fromBlock, body.params[0].toBlock])
          return true
        })
        .reply(200, logsReply('0x5'))

      const { result } = await apiChunked.getLogs(5, 104, ADDRESS, [TOPIC])

      expect(ranges).toEqual([['0x5', '0x68']]) // 5-104, exactly 100 blocks
      expect(result).toHaveLength(1)
    })
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
        expect.objectContaining({
          url: 'primary.example:8545',
          err: expect.any(JsonRpcServerError),
        })
      )
      const warnDetails = vi.mocked(logger.warn).mock.calls[0][1] as {
        err: JsonRpcServerError
      }
      expect(warnDetails.err.statusCode).toBe(502)
      expect(warnDetails.err.response).toEqual({
        code: -32603,
        message: 'internal error',
      })
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
