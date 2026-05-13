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
    mockEthServer(nodeSyncingMock(), config.CONSENSUS_NODE)

    const res = await api.syncing()

    expect(res).toBe(true)
  })

  it('should fetch genesis data', async () => {
    mockEthServer(genesisMock(), config.CONSENSUS_NODE)

    const res = await api.genesis()

    expect(res).toEqual(genesisMock().result.data)
  })

  it('should fetch state data', async () => {
    mockEthServer(stateMock(), config.CONSENSUS_NODE)

    const res = await api.state()

    expect(res).toEqual(stateMock().result.data)
  })

  it('should fetch validator info', async () => {
    const id = '1'
    const mock = validatorInfoMock(id)
    mockEthServer(mock, config.CONSENSUS_NODE)

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
    nock(config.CONSENSUS_NODE)
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
    mockEthServer(exitRequestMock(), config.CONSENSUS_NODE)

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
    nock(config.CONSENSUS_NODE)
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
    nock(config.CONSENSUS_NODE)
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
    nock(config.CONSENSUS_NODE)
      .get(
        '/eth/v1/beacon/states/head/validators?id=' +
          indices.slice(0, 1000).join(',')
      )
      .reply(200, mockBatch1)
    nock(config.CONSENSUS_NODE)
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
    nock(config.CONSENSUS_NODE)
      .get('/eth/v1/beacon/states/head/validators?id=1')
      .reply(500, { message: 'Internal Server Error' })

    await expect(api.getExitingValidatorsCount(indices, 1000)).rejects.toThrow()
  })
})
