import nock from 'nock'
import {
  ConsensusApiService,
  makeConsensusApi,
  FAR_FUTURE_EPOCH,
} from './service.js'
import { LoggerService, RequestService, makeRequest } from '../../lib/index.js'
import {
  exitRequestMock,
  genesisMock,
  nodeSyncingMock,
  stateMock,
  validatorInfoMock,
} from './fixtures.js'
import { mockEthServer } from '../../test/mock-eth-server.js'
import { mockLogger } from '../../test/logger.js'
import { mockConfig } from '../../test/config.js'
import { ConfigService } from '../config/service.js'

describe('makeConsensusApi', () => {
  let api: ConsensusApiService
  let request: RequestService
  let logger: LoggerService
  let config: ConfigService

  beforeEach(() => {
    request = makeRequest([])
    logger = mockLogger()
    config = mockConfig(logger, { CONSENSUS_NODE: 'http://localhost:4445' })
    api = makeConsensusApi(request, logger, config)
  })

  it('should fetch syncing status', async () => {
    mockEthServer(nodeSyncingMock(), config.CONSENSUS_NODE[0])

    const res = await api.syncing()

    expect(res).toBe(true)
  })

  it('should fetch genesis data', async () => {
    mockEthServer(genesisMock(), config.CONSENSUS_NODE[0])

    const res = await api.genesis()

    expect(res).toEqual(genesisMock().result.data)
  })

  it('should fetch state data', async () => {
    mockEthServer(stateMock(), config.CONSENSUS_NODE[0])

    const res = await api.state()

    expect(res).toEqual(stateMock().result.data)
  })

  it('should fetch validator info', async () => {
    const id = '1'
    const mock = validatorInfoMock(id)
    mockEthServer(mock, config.CONSENSUS_NODE[0])

    const res = await api.validatorInfo(id)

    expect(res).toEqual({
      index: mock.result.data.index,
      pubKey: mock.result.data.validator.pubkey,
      status: mock.result.data.status,
      isExiting: false,
    })
  })

  it('should fetch validator info in batch', async () => {
    const indices = ['1', '2']
    const mockResponse = {
      data: [
        {
          index: '1',
          status: 'active_ongoing',
          validator: { pubkey: '0x123', exit_epoch: FAR_FUTURE_EPOCH },
        },
        {
          index: '2',
          status: 'active_exiting',
          validator: { pubkey: '0x456', exit_epoch: '100' },
        },
      ],
    }
    nock(config.CONSENSUS_NODE[0])
      .get('/eth/v1/beacon/states/head/validators?id=1,2')
      .reply(200, mockResponse)

    const res = await api.fetchValidatorsInfoBatch(indices, 1000)

    expect(res).toEqual(
      new Map([
        [
          '1',
          {
            index: '1',
            pubKey: '0x123',
            status: 'active_ongoing',
            isExiting: false,
          },
        ],
        [
          '2',
          {
            index: '2',
            pubKey: '0x456',
            status: 'active_exiting',
            isExiting: true,
          },
        ],
      ])
    )
  })

  it('should send exit request', async () => {
    const message = {
      message: {
        epoch: '1',
        validator_index: '1',
      },
      signature: '1',
    }
    mockEthServer(exitRequestMock(), config.CONSENSUS_NODE[0])

    await api.exitRequest(message)

    // Since exitRequest doesn't return a value, we simply check that no error is thrown
    expect(true).toBe(true)
  })

  it('should correctly count exiting validators in mixed batch', async () => {
    const indices = ['1', '2', '3', '4']
    const mockResponse = {
      data: [
        {
          index: '1',
          status: 'active_ongoing',
          validator: { pubkey: '0x123', exit_epoch: '100' },
        },
        {
          index: '2',
          status: 'active_ongoing',
          validator: { pubkey: '0x456', exit_epoch: FAR_FUTURE_EPOCH },
        },
        {
          index: '3',
          status: 'active_ongoing',
          validator: { pubkey: '0x789', exit_epoch: '200' },
        },
        {
          index: '4',
          status: 'active_ongoing',
          validator: { pubkey: '0xabc', exit_epoch: FAR_FUTURE_EPOCH },
        },
      ],
    }
    nock(config.CONSENSUS_NODE[0])
      .get('/eth/v1/beacon/states/head/validators?id=1,2,3,4')
      .reply(200, mockResponse)

    const count = await api.getExitingValidatorsCount(indices, 1000)
    expect(count).toBe(2)
  })

  it('should return 0 when validators not found', async () => {
    const indices = ['1', '2', '3', '4']
    const mockResponse = {
      data: [],
    }
    nock(config.CONSENSUS_NODE[0])
      .get('/eth/v1/beacon/states/head/validators?id=1,2,3,4')
      .reply(200, mockResponse)

    const count = await api.getExitingValidatorsCount(indices, 1000)
    expect(count).toBe(0)
  })

  it('should handle batch size correctly with large index array', async () => {
    const indices = Array.from({ length: 1500 }, (_, i) => (i + 1).toString())
    const mockBatch1 = {
      data: Array(1000).fill({
        index: '1',
        status: 'active_ongoing',
        validator: { pubkey: '0x123', exit_epoch: '100' },
      }),
    }
    const mockBatch2 = {
      data: Array(500).fill({
        index: '2',
        status: 'active_ongoing',
        validator: { pubkey: '0x456', exit_epoch: FAR_FUTURE_EPOCH },
      }),
    }
    nock(config.CONSENSUS_NODE[0])
      .get(
        '/eth/v1/beacon/states/head/validators?id=' +
          indices.slice(0, 1000).join(',')
      )
      .reply(200, mockBatch1)
    nock(config.CONSENSUS_NODE[0])
      .get(
        '/eth/v1/beacon/states/head/validators?id=' +
          indices.slice(1000).join(',')
      )
      .reply(200, mockBatch2)

    const count = await api.getExitingValidatorsCount(indices, 1000)
    expect(count).toBe(1000)
  })

  it('should throw an error on server error (500)', async () => {
    const indices = ['1']
    nock(config.CONSENSUS_NODE[0])
      .get('/eth/v1/beacon/states/head/validators?id=1')
      .reply(500, { message: 'Internal Server Error' })

    await expect(api.getExitingValidatorsCount(indices, 1000)).rejects.toThrow()
  })

  describe('multi-URL fallback', () => {
    const PRIMARY = 'http://primary.cl.example:5051'
    const SECONDARY = 'http://secondary.cl.example:5051'

    it('falls back to the next URL when the primary returns 5xx', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      nock(PRIMARY).get('/eth/v1/beacon/genesis').reply(503, 'busy')
      mockEthServer(genesisMock(), SECONDARY)

      const res = await apiMulti.genesis()

      expect(res).toEqual(genesisMock().result.data)
      expect(logger.warn).toHaveBeenCalledWith(
        'CL endpoint failed, trying next',
        expect.objectContaining({ url: 'primary.cl.example:5051' })
      )
    })

    it('validatorInfo falls back to the next URL on 5xx', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      const id = '42'
      nock(PRIMARY)
        .get(`/eth/v1/beacon/states/head/validators/${id}`)
        .reply(503, 'busy')
      const mock = validatorInfoMock(id)
      mockEthServer(mock, SECONDARY)

      const res = await apiMulti.validatorInfo(id)

      expect(res.index).toBe(mock.result.data.index)
      expect(logger.warn).toHaveBeenCalledWith(
        'CL endpoint failed, trying next',
        expect.objectContaining({ url: 'primary.cl.example:5051' })
      )
    })

    it('validatorInfo falls back to the next URL on transient 408', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      const id = '42'
      nock(PRIMARY)
        .get(`/eth/v1/beacon/states/head/validators/${id}`)
        .reply(408, { message: 'request timeout' })
      const mock = validatorInfoMock(id)
      mockEthServer(mock, SECONDARY)

      const res = await apiMulti.validatorInfo(id)

      expect(res.index).toBe(mock.result.data.index)
      expect(logger.warn).toHaveBeenCalledWith(
        'CL endpoint failed, trying next',
        expect.objectContaining({ url: 'primary.cl.example:5051' })
      )
    })

    it('validatorInfo falls back to the next URL on transient 429', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      const id = '42'
      nock(PRIMARY)
        .get(`/eth/v1/beacon/states/head/validators/${id}`)
        .reply(429, { message: 'rate limited' })
      const mock = validatorInfoMock(id)
      mockEthServer(mock, SECONDARY)

      const res = await apiMulti.validatorInfo(id)

      expect(res.index).toBe(mock.result.data.index)
      expect(logger.warn).toHaveBeenCalledWith(
        'CL endpoint failed, trying next',
        expect.objectContaining({ url: 'primary.cl.example:5051' })
      )
    })

    it('validatorInfo preserves 4xx error message and does not rotate', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      const id = '404'
      const primaryScope = nock(PRIMARY)
        .get(`/eth/v1/beacon/states/head/validators/${id}`)
        .reply(404, { message: 'validator not found' })

      await expect(apiMulti.validatorInfo(id)).rejects.toThrow(
        'validator not found'
      )
      expect(primaryScope.isDone()).toBe(true)
      expect(logger.warn).not.toHaveBeenCalledWith(
        'CL endpoint failed, trying next',
        expect.any(Object)
      )
    })

    it('validatorInfo treats 414 as terminal and does not rotate', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      const id = 'too-long'
      const primaryScope = nock(PRIMARY)
        .get(`/eth/v1/beacon/states/head/validators/${id}`)
        .reply(414, { message: 'URI too long' })

      await expect(apiMulti.validatorInfo(id)).rejects.toThrow('URI too long')
      expect(primaryScope.isDone()).toBe(true)
      expect(logger.warn).not.toHaveBeenCalledWith(
        'CL endpoint failed, trying next',
        expect.any(Object)
      )
    })

    it('validatorInfo uses safe parsing for non-JSON 4xx responses', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      const id = 'cloudflare'
      const primaryScope = nock(PRIMARY)
        .get(`/eth/v1/beacon/states/head/validators/${id}`)
        .reply(400, '<html>Bad request</html>')

      await expect(apiMulti.validatorInfo(id)).rejects.toThrow(
        'Received markup (HTML/XML) response instead of JSON. Status:'
      )
      expect(primaryScope.isDone()).toBe(true)
      expect(logger.warn).not.toHaveBeenCalledWith(
        'CL endpoint failed, trying next',
        expect.any(Object)
      )
    })

    it('fetchValidatorsInfoBatch falls back to the next URL on 5xx', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      const mockResponse = {
        data: [
          {
            index: '1',
            status: 'active_ongoing',
            validator: { pubkey: '0x123', exit_epoch: FAR_FUTURE_EPOCH },
          },
          {
            index: '2',
            status: 'active_exiting',
            validator: { pubkey: '0x456', exit_epoch: '100' },
          },
        ],
      }

      const primaryScope = nock(PRIMARY)
        .get('/eth/v1/beacon/states/head/validators?id=1,2')
        .reply(503, 'busy')
      const secondaryScope = nock(SECONDARY)
        .get('/eth/v1/beacon/states/head/validators?id=1,2')
        .reply(200, mockResponse)

      const res = await apiMulti.fetchValidatorsInfoBatch(['1', '2'], 1000)

      expect(primaryScope.isDone()).toBe(true)
      expect(secondaryScope.isDone()).toBe(true)
      expect(res).toEqual(
        new Map([
          [
            '1',
            {
              index: '1',
              pubKey: '0x123',
              status: 'active_ongoing',
              isExiting: false,
            },
          ],
          [
            '2',
            {
              index: '2',
              pubKey: '0x456',
              status: 'active_exiting',
              isExiting: true,
            },
          ],
        ])
      )
      expect(logger.warn).toHaveBeenCalledWith(
        'CL endpoint failed, trying next',
        expect.objectContaining({ url: 'primary.cl.example:5051' })
      )
    })

    it('validatePublicKeys uses CL batch fallback', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      const mockResponse = {
        data: [
          {
            index: '1',
            status: 'active_ongoing',
            validator: { pubkey: '0x123', exit_epoch: FAR_FUTURE_EPOCH },
          },
        ],
      }

      const primaryScope = nock(PRIMARY)
        .get('/eth/v1/beacon/states/head/validators?id=1')
        .reply(503, 'busy')
      const secondaryScope = nock(SECONDARY)
        .get('/eth/v1/beacon/states/head/validators?id=1')
        .reply(200, mockResponse)

      const res = await apiMulti.validatePublicKeys([
        { validatorIndex: '1', validatorPubkey: '0x123' },
      ])

      expect(primaryScope.isDone()).toBe(true)
      expect(secondaryScope.isDone()).toBe(true)
      expect(res).toEqual(new Set(['1']))
      expect(logger.warn).toHaveBeenCalledWith(
        'CL endpoint failed, trying next',
        expect.objectContaining({ url: 'primary.cl.example:5051' })
      )
    })

    it('genesis does not rotate on 4xx (terminal)', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      nock(PRIMARY).get('/eth/v1/beacon/genesis').reply(404, 'not found')
      // Note: no mock for SECONDARY — if the call rotated, nock would error
      // about an unexpected request, surfacing the bug.

      await expect(apiMulti.genesis()).rejects.toBeInstanceOf(Error)
      expect(logger.warn).not.toHaveBeenCalledWith(
        'CL endpoint failed, trying next',
        expect.any(Object)
      )
    })
  })

  describe('multi-URL broadcast (exitRequest)', () => {
    const PRIMARY = 'http://primary.cl.example:5051'
    const SECONDARY = 'http://secondary.cl.example:5051'

    const exitMessage = {
      message: { epoch: '1', validator_index: '1' },
      signature: '1',
    }

    it('POSTs the voluntary exit to every configured URL when all succeed', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      const primaryScope = nock(PRIMARY)
        .post('/eth/v1/beacon/pool/voluntary_exits')
        .reply(200, '')
      const secondaryScope = nock(SECONDARY)
        .post('/eth/v1/beacon/pool/voluntary_exits')
        .reply(200, '')

      await apiMulti.exitRequest(exitMessage)

      expect(primaryScope.isDone()).toBe(true)
      expect(secondaryScope.isDone()).toBe(true)
    })

    it('succeeds when at least one endpoint accepts the exit', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      nock(PRIMARY)
        .post('/eth/v1/beacon/pool/voluntary_exits')
        .reply(503, 'busy')
      const secondaryScope = nock(SECONDARY)
        .post('/eth/v1/beacon/pool/voluntary_exits')
        .reply(200, '')

      await expect(apiMulti.exitRequest(exitMessage)).resolves.toBeUndefined()

      expect(secondaryScope.isDone()).toBe(true)
      expect(logger.warn).toHaveBeenCalledWith(
        'CL broadcast failed at endpoint',
        expect.objectContaining({ url: 'primary.cl.example:5051' })
      )
      expect(logger.info).toHaveBeenCalledWith(
        'CL broadcast partial success',
        expect.objectContaining({ ok: 1, failed: 1, total: 2 })
      )
    })

    it('throws when every endpoint rejects the exit', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      nock(PRIMARY)
        .post('/eth/v1/beacon/pool/voluntary_exits')
        .reply(503, 'busy')
      nock(SECONDARY)
        .post('/eth/v1/beacon/pool/voluntary_exits')
        .reply(500, 'oops')

      await expect(apiMulti.exitRequest(exitMessage)).rejects.toThrow(
        /broadcast failed at all 2 endpoints/
      )
    })

    it('exitRequest preserves 5xx safe-parse messages when every endpoint rejects', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      nock(PRIMARY)
        .post('/eth/v1/beacon/pool/voluntary_exits')
        .reply(503, '<html>proxy error</html>')
      nock(SECONDARY)
        .post('/eth/v1/beacon/pool/voluntary_exits')
        .reply(500, { message: 'secondary server rejected exit' })

      let caught: unknown
      try {
        await apiMulti.exitRequest(exitMessage)
      } catch (error) {
        caught = error
      }

      expect(caught).toBeInstanceOf(AggregateError)
      expect(
        (caught as AggregateError).errors.map((error) => error.message)
      ).toEqual([
        'Received markup (HTML/XML) response instead of JSON. Status:',
        'secondary server rejected exit',
      ])
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Received markup (HTML/XML) response instead of JSON. Status: 503'
        ),
        { content: '<html>proxy error</html>' }
      )
    })

    it('exitRequest preserves CL error messages when every endpoint rejects', async () => {
      const cfg = mockConfig(logger, {
        CONSENSUS_NODE: `${PRIMARY},${SECONDARY}`,
      })
      const apiMulti = makeConsensusApi(request, logger, cfg)

      nock(PRIMARY)
        .post('/eth/v1/beacon/pool/voluntary_exits')
        .reply(400, { message: 'primary rejected exit' })
      nock(SECONDARY)
        .post('/eth/v1/beacon/pool/voluntary_exits')
        .reply(400, { message: 'secondary rejected exit' })

      let caught: unknown
      try {
        await apiMulti.exitRequest(exitMessage)
      } catch (error) {
        caught = error
      }

      expect(caught).toBeInstanceOf(AggregateError)
      expect(
        (caught as AggregateError).errors.map((error) => error.message)
      ).toEqual(['primary rejected exit', 'secondary rejected exit'])
    })
  })
})
