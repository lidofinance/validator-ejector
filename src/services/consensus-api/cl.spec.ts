import { ConsensusApiService, makeConsensusApi } from './service.js'
import { LoggerService, RequestService, makeRequest } from 'lido-nanolib'
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
})
