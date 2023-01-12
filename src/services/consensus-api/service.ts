import { makeLogger, makeRequest, notOkError } from 'lido-nanolib'
import { syncingDTO, genesisDTO, stateDTO, validatorInfoDTO } from './dto.js'

export type ConsensusApiService = ReturnType<typeof makeConsensusApi>

export const makeConsensusApi = (
  request: ReturnType<typeof makeRequest>,
  logger: ReturnType<typeof makeLogger>,
  { CONSENSUS_NODE, DRY_RUN }: { CONSENSUS_NODE: string; DRY_RUN: boolean }
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

  const validatorInfo = async (id: string) => {
    const req = await request(
      `${normalizedUrl}/eth/v1/beacon/states/finalized/validators/${id}`
    )

    if (!req.ok) {
      const { message } = (await req.json()) as { message: string }
      throw new Error(message)
    }

    const result = validatorInfoDTO(await req.json())

    const index = result.data.index
    const pubKey = result.data.validator.pubkey
    const status = result.data.status

    let isExiting: boolean
    switch (status) {
      case 'active_exiting':
      case 'exited_unslashed':
      case 'exited_slashed':
      case 'withdrawal_possible': // already exited
      case 'withdrawal_done': // already exited
        isExiting = true
      default:
        isExiting = false
    }

    logger.debug(`Validator index for ${id} is ${index}`)
    logger.debug(`Validator pubKey for ${id} is ${pubKey}`)
    logger.debug(`Validator status for ${id} is ${status}`)
    logger.debug(`Validator exiting for ${id} is ${isExiting}`)

    return { index, pubKey, status, isExiting }
  }

  const exitRequest = async (message: {
    message: {
      epoch: string
      validator_index: string
    }
    signature: string
  }) => {
    if (DRY_RUN) {
      logger.info('Not sending an exit in a dry run mode')
      return
    }

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
  return {
    syncing,
    checkSync,
    genesis,
    state,
    validatorInfo,
    exitRequest,
  }
}
