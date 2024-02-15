import { makeLogger, makeRequest, notOkError } from 'lido-nanolib'
import {
  syncingDTO,
  genesisDTO,
  stateDTO,
  validatorInfoDTO,
  specDTO,
  depositContractDTO,
} from './dto.js'

const FAR_FUTURE_EPOCH = String(2n ** 64n - 1n)

export type ConsensusApiService = ReturnType<typeof makeConsensusApi>

export const makeConsensusApi = (
  request: ReturnType<typeof makeRequest>,
  logger: ReturnType<typeof makeLogger>,
  { CONSENSUS_NODE }: { CONSENSUS_NODE: string }
) => {
  const normalizedUrl = CONSENSUS_NODE.endsWith('/')
    ? CONSENSUS_NODE.slice(0, -1)
    : CONSENSUS_NODE

  const syncing = async () => {
    const res = await request(`${normalizedUrl}/eth/v1/node/syncing`, {
      middlewares: [notOkError()],
    })
    const { data } = syncingDTO(await res.json())
    logger.debug('fetched syncing status')
    return data.is_syncing
  }

  const checkSync = async () => {
    if (await syncing()) {
      logger.warn('Consensus node is still syncing! Proceed with caution.')
    }
  }

  const genesis = async () => {
    const res = await request(`${normalizedUrl}/eth/v1/beacon/genesis`, {
      middlewares: [notOkError()],
    })
    const { data } = genesisDTO(await res.json())
    logger.debug('fetched genesis data')
    return data
  }

  const state = async () => {
    const res = await request(
      `${normalizedUrl}/eth/v1/beacon/states/finalized/fork`,
      {
        middlewares: [notOkError()],
      }
    )
    const { data } = stateDTO(await res.json())
    logger.debug('fetched state data')
    return data
  }

  const spec = async () => {
    const res = await request(`${normalizedUrl}/eth/v1/config/spec`, {
      middlewares: [notOkError()],
    })
    const { data } = specDTO(await res.json())
    logger.debug('fetched spec data')
    return data
  }

  const isExiting = async (validatorPubkey: string) => {
    return (await validatorInfo(validatorPubkey)).isExiting
  }

  const validatorInfo = async (id: string) => {
    const req = await request(
      `${normalizedUrl}/eth/v1/beacon/states/head/validators/${id}`
    )

    if (!req.ok) {
      const { message } = (await req.json()) as { message: string }
      throw new Error(message)
    }

    const result = validatorInfoDTO(await req.json())

    const { index, validator, status } = result.data
    const pubKey = validator.pubkey

    const isExiting = validator.exit_epoch === FAR_FUTURE_EPOCH ? false : true

    logger.debug('Validator info', { index, pubKey, status, isExiting })

    return { index, pubKey, status, isExiting }
  }

  const exitRequest = async (message: {
    message: {
      epoch: string
      validator_index: string
    }
    signature: string
  }) => {
    const req = await request(
      `${normalizedUrl}/eth/v1/beacon/pool/voluntary_exits`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      }
    )

    if (!req.ok) {
      const { message } = (await req.json()) as { message: string }
      throw new Error(message)
    }
  }

  const depositContract = async () => {
    const res = await request(
      `${normalizedUrl}/eth/v1/config/deposit_contract`,
      {
        middlewares: [notOkError()],
      }
    )
    const { data } = depositContractDTO(await res.json())
    logger.debug('fetched deposit contract data')
    return data
  }

  const chainId = async () => {
    return (await depositContract()).chain_id
  }

  return {
    syncing,
    checkSync,
    genesis,
    state,
    validatorInfo,
    exitRequest,
    isExiting,
    spec,
    depositContract,
    chainId,
  }
}
