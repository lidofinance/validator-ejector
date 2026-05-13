import nodeFetch from 'node-fetch'
import { ConsensusApiService, makeConsensusApi } from './service.js'
import {
  LoggerService,
  abort,
  logger as loggerMiddleware,
  makeLogger,
  makeRequest,
  retry,
} from '../../lib/index.js'
import { mockConfig } from '../../test/config.js'
import { ConfigService } from '../config/service.js'

describe('makeConsensusApi e2e', () => {
  let api: ConsensusApiService
  let logger: LoggerService
  let config: ConfigService
  let finalizedSlot: number

  beforeEach(async () => {
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

    const res = await nodeFetch(
      `${config.CONSENSUS_NODE}/eth/v1/beacon/headers/finalized`
    )
    const json = (await res.json()) as {
      data: { header: { message: { slot: string } } }
    }
    finalizedSlot = Number(json.data.header.message.slot)
  })

  it('should handle batch size correctly with large index array e2e', async () => {
    const indices = Array.from({ length: 3000 }, (_, i) => (i + 1).toString())
    const count = await api.getExitingValidatorsCount(
      indices,
      1000,
      finalizedSlot
    )
    expect(typeof count).toBe('number')
    expect(count).toBeGreaterThanOrEqual(0)
    expect(count).toBeLessThanOrEqual(indices.length)
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
      finalizedSlot
    )
    expect(validIndices.size).toEqual(2)
  })

  it('should fetch validators batch e2e', async () => {
    const indices = ['1', '2']
    const validators = await api.fetchValidatorsBatch(
      indices,
      1000,
      finalizedSlot
    )

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
