import { ConsensusApiService, makeConsensusApi } from './service.js'
import { LoggerService, RequestService, makeRequest } from 'lido-nanolib'
import {
  exitRequestMock,
  genesisMock,
  nodeSyncingMock,
  stateMock,
  validatorInfoMock,
} from './fixtures.js'
import { mockCLServer } from '../../test/cl-server.js'
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
    mockCLServer(nodeSyncingMock(), config)

    const res = await api.syncing()

    expect(res).toBe(true)
  })

  it('should fetch genesis data', async () => {
    mockCLServer(genesisMock(), config)

    const res = await api.genesis()

    expect(res).toEqual(genesisMock().result.data)
  })

  it('should fetch state data', async () => {
    mockCLServer(stateMock(), config)

    const res = await api.state()

    expect(res).toEqual(stateMock().result.data)
  })

  it('should fetch validator info', async () => {
    const id = '1'
    const mock = validatorInfoMock(id)
    mockCLServer(mock, config)

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
    mockCLServer(exitRequestMock(), config)

    await api.exitRequest(message)

    // Since exitRequest doesn't return a value, we simply check that no error is thrown
    expect(true).toBe(true)
  })
})
