import nock from 'nock'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ConsistencyChecker, makeConsistencyChecker } from './service.js'
import { LoggerService, RequestService, makeRequest } from '../../lib/index.js'
import { mockLogger } from '../../test/logger.js'
import { mockConfig } from '../../test/config.js'

const elChainIdMock = (hex: string) => ({
  jsonrpc: '2.0',
  id: 1,
  result: hex,
})

const clDepositContractMock = (chainId: string) => ({
  data: {
    chain_id: chainId,
    address: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
  },
})

describe('makeConsistencyChecker', () => {
  let request: RequestService
  let logger: LoggerService

  beforeEach(() => {
    request = makeRequest([])
    logger = mockLogger()
  })

  afterEach(() => nock.cleanAll())

  it('resolves with the agreed chain id when single EL+CL URLs match', async () => {
    const config = mockConfig(logger, {
      EXECUTION_NODE: 'http://el.example:8545',
      CONSENSUS_NODE: 'http://cl.example:5051',
    })
    const checker: ConsistencyChecker = makeConsistencyChecker(
      request,
      logger,
      config
    )

    nock('http://el.example:8545').post('/').reply(200, elChainIdMock('0x1'))
    nock('http://cl.example:5051')
      .get('/eth/v1/config/deposit_contract')
      .reply(200, clDepositContractMock('1'))

    await expect(checker.checkChainIds()).resolves.toEqual({ chainId: 1 })
    expect(logger.info).toHaveBeenCalledWith(
      'Chain-id consistency check passed',
      expect.objectContaining({ chainId: 1, elEndpoints: 1, clEndpoints: 1 })
    )
  })

  it('resolves when every EL and CL URL agrees in a multi-URL config', async () => {
    const config = mockConfig(logger, {
      EXECUTION_NODE: 'http://el-a.example:8545,http://el-b.example:8545',
      CONSENSUS_NODE: 'http://cl-a.example:5051,http://cl-b.example:5051',
    })
    const checker = makeConsistencyChecker(request, logger, config)

    nock('http://el-a.example:8545').post('/').reply(200, elChainIdMock('0x1'))
    nock('http://el-b.example:8545').post('/').reply(200, elChainIdMock('0x1'))
    nock('http://cl-a.example:5051')
      .get('/eth/v1/config/deposit_contract')
      .reply(200, clDepositContractMock('1'))
    nock('http://cl-b.example:5051')
      .get('/eth/v1/config/deposit_contract')
      .reply(200, clDepositContractMock('1'))

    await expect(checker.checkChainIds()).resolves.toEqual({ chainId: 1 })
  })

  it('throws when EL endpoints report different chain ids', async () => {
    const config = mockConfig(logger, {
      EXECUTION_NODE: 'http://el-a.example:8545,http://el-b.example:8545',
      CONSENSUS_NODE: 'http://cl.example:5051',
    })
    const checker = makeConsistencyChecker(request, logger, config)

    nock('http://el-a.example:8545').post('/').reply(200, elChainIdMock('0x1'))
    nock('http://el-b.example:8545').post('/').reply(200, elChainIdMock('0x5'))
    // CL mock omitted on purpose: EL collection fails first and short-circuits.

    await expect(checker.checkChainIds()).rejects.toThrow(/different chain ids/)
    expect(logger.error).toHaveBeenCalledWith(
      'EL endpoints report different chain ids',
      expect.objectContaining({
        detail: expect.arrayContaining([
          expect.objectContaining({ idx: 0, chainId: 1 }),
          expect.objectContaining({ idx: 1, chainId: 5 }),
        ]),
      })
    )
  })

  it('throws when CL endpoints report different chain ids', async () => {
    const config = mockConfig(logger, {
      EXECUTION_NODE: 'http://el.example:8545',
      CONSENSUS_NODE: 'http://cl-a.example:5051,http://cl-b.example:5051',
    })
    const checker = makeConsistencyChecker(request, logger, config)

    nock('http://el.example:8545').post('/').reply(200, elChainIdMock('0x1'))
    nock('http://cl-a.example:5051')
      .get('/eth/v1/config/deposit_contract')
      .reply(200, clDepositContractMock('1'))
    nock('http://cl-b.example:5051')
      .get('/eth/v1/config/deposit_contract')
      .reply(200, clDepositContractMock('5'))

    await expect(checker.checkChainIds()).rejects.toThrow(/different chain ids/)
    expect(logger.error).toHaveBeenCalledWith(
      'CL endpoints report different chain ids',
      expect.objectContaining({
        detail: expect.arrayContaining([
          expect.objectContaining({ idx: 0, chainId: 1 }),
          expect.objectContaining({ idx: 1, chainId: 5 }),
        ]),
      })
    )
  })

  it('throws when EL chain id does not match CL chain id', async () => {
    const config = mockConfig(logger, {
      EXECUTION_NODE: 'http://el.example:8545',
      CONSENSUS_NODE: 'http://cl.example:5051',
    })
    const checker = makeConsistencyChecker(request, logger, config)

    nock('http://el.example:8545').post('/').reply(200, elChainIdMock('0x1'))
    nock('http://cl.example:5051')
      .get('/eth/v1/config/deposit_contract')
      .reply(200, clDepositContractMock('5'))

    await expect(checker.checkChainIds()).rejects.toThrow(
      /EL chain id .* does not match CL chain id/
    )
    expect(logger.error).toHaveBeenCalledWith(
      'EL and CL endpoints report different chain ids',
      expect.objectContaining({ elChainId: 1, clChainId: 5 })
    )
  })

  it('throws when an EL endpoint returns a 5xx (fail boot, not skip)', async () => {
    const config = mockConfig(logger, {
      EXECUTION_NODE: 'http://el-a.example:8545,http://el-b.example:8545',
      CONSENSUS_NODE: 'http://cl.example:5051',
    })
    const checker = makeConsistencyChecker(request, logger, config)

    nock('http://el-a.example:8545').post('/').reply(503, 'busy')
    nock('http://el-b.example:8545').post('/').reply(200, elChainIdMock('0x1'))
    // CL mock omitted: EL collect throws before CL is queried.

    await expect(checker.checkChainIds()).rejects.toThrow(
      /EL chain-id check failed for 1 of 2 endpoints/
    )
    expect(logger.error).toHaveBeenCalledWith(
      'EL chain-id check failed',
      expect.objectContaining({
        idx: 0,
        url: 'el-a.example:8545',
      })
    )
  })

  it('throws when a CL endpoint returns a body without data.chain_id', async () => {
    const config = mockConfig(logger, {
      EXECUTION_NODE: 'http://el.example:8545',
      CONSENSUS_NODE: 'http://cl.example:5051',
    })
    const checker = makeConsistencyChecker(request, logger, config)

    nock('http://el.example:8545').post('/').reply(200, elChainIdMock('0x1'))
    nock('http://cl.example:5051')
      .get('/eth/v1/config/deposit_contract')
      .reply(200, { data: { address: '0x000' } })

    await expect(checker.checkChainIds()).rejects.toThrow(
      /CL chain-id check failed for 1 of 1 endpoints/
    )
    expect(logger.error).toHaveBeenCalledWith(
      'CL chain-id check failed',
      expect.objectContaining({ idx: 0, url: 'cl.example:5051' })
    )
  })
})
