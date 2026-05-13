import nock from 'nock'
import {
  ConsensusApiService,
  makeConsensusApi,
  FAR_FUTURE_EPOCH,
} from './service.js'
import {
  LoggerService,
  RequestService,
  makeRequest,
  makeLogger,
  retry,
  logger as loggerMiddleware,
  abort,
} from '../../lib/index.js'
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
  })
})

describe('makeConsensusApi e2e', () => {
  let api: ConsensusApiService
  let logger: LoggerService
  let config: ConfigService

  beforeEach(() => {
    logger = makeLogger({
      level: 'error',
      format: 'simple',
    })

    config = mockConfig(logger, {
      CONSENSUS_NODE:
        process.env.CONSENSUS_NODE ??
        'https://ethereum-beacon-api.publicnode.com',
    })
    api = makeConsensusApi(
      makeRequest([retry(3), loggerMiddleware(logger), abort(30_000)]),
      logger,
      config
    )
  })

  it('should handle batch size correctly with large index array e2e', async () => {
    const indices = Array.from({ length: 3000 }, (_, i) => (i + 1).toString())
    const count = await api.getExitingValidatorsCount(indices, 1000, 11724253)
    expect(count).toStrictEqual(1226)
  })

  it('should validate public keys e2e', async () => {
    const validatorData = [
      {
        validatorIndex: '1',
        validatorPubkey:
          '0xa1d1ad0714035353258038e964ae9675dc0252ee22cea896825c01458e1807bfad2f9969338798548d9858a571f7425c',
      },
      {
        validatorIndex: '2',
        validatorPubkey:
          '0xb2ff4716ed345b05dd1dfc6a5a9fa70856d8c75dcc9e881dd2f766d5f891326f0d10e96f3a444ce6c912b69c22c6754d',
      },
      {
        validatorIndex: '3',
        validatorPubkey:
          '0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      },
    ]

    const validIndices = await api.validatePublicKeys(
      validatorData,
      1000,
      11724253
    )
    expect(validIndices.size).toEqual(2)
  })

  it('should fetch validators batch e2e', async () => {
    const indices = ['1', '2']
    const validators = await api.fetchValidatorsBatch(indices, 1000, 11724253)

    expect(validators).toHaveLength(2)

    expect(validators[0].index).toBe('1')
    expect(validators[0].status).toBe('active_ongoing')
    expect(validators[0].validator.pubkey).toBe(
      '0xa1d1ad0714035353258038e964ae9675dc0252ee22cea896825c01458e1807bfad2f9969338798548d9858a571f7425c'
    )
    expect(validators[0].validator.exit_epoch).toBe('18446744073709551615')

    expect(validators[1].index).toBe('2')
    expect(validators[1].status).toBe('active_ongoing')
    expect(validators[1].validator.pubkey).toBe(
      '0xb2ff4716ed345b05dd1dfc6a5a9fa70856d8c75dcc9e881dd2f766d5f891326f0d10e96f3a444ce6c912b69c22c6754d'
    )
    expect(validators[1].validator.exit_epoch).toBe('18446744073709551615')
  })
})
