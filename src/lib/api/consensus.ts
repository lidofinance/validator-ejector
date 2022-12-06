import { makeLogger, makeRequest } from 'tooling-nanolib-test'
import {
  genesisDTO,
  stateDTO,
  validatorIndexDTO,
  validatorPubKeyDTO,
  validatorStatusDTO,
} from './consensus-dto.js'

export type ConsensusApi = ReturnType<typeof makeConsensusApi>

export const makeConsensusApi = (
  request: ReturnType<typeof makeRequest>,
  logger: ReturnType<typeof makeLogger>,
  { CONSENSUS_NODE, DRY_RUN }: { CONSENSUS_NODE: string; DRY_RUN: boolean }
) => {
  const genesis = async () => {
    const res = await request(`${CONSENSUS_NODE}/eth/v1/beacon/genesis`)
    const { data } = genesisDTO(await res.json())
    logger.debug('fetched genesis data')
    return data
  }

  const state = async () => {
    const res = await request(
      `${CONSENSUS_NODE}/eth/v1/beacon/states/finalized/fork`
    )
    const { data } = stateDTO(await res.json())
    logger.debug('fetched state data')
    return data
  }

  const validatorIndex = async (pubKey: string) => {
    const res = await request(
      `${CONSENSUS_NODE}/eth/v1/beacon/states/finalized/validators/${pubKey}`
    )

    const {
      data: { index },
    } = validatorIndexDTO(await res.json())

    logger.debug(`Validator index for ${pubKey} is ${index}`)
    return index
  }

  const validatorPubkey = async (validatorIndex: string) => {
    const res = await request(
      `${CONSENSUS_NODE}/eth/v1/beacon/states/finalized/validators/${validatorIndex}`
    )
    const result = validatorPubKeyDTO(await res.json())

    logger.debug(
      `Validator pubkey for ${validatorIndex} is ${result.data.validator.pubkey}`
    )
    return result.data.validator.pubkey
  }

  const isExiting = async (pubkey: string) => {
    const res = await request(
      `${CONSENSUS_NODE}/eth/v1/beacon/states/finalized/validators/${pubkey}`
    )
    const result = validatorStatusDTO(await res.json())
    switch (result.data.status) {
      case 'active_exiting':
      case 'exited_unslashed':
      case 'exited_slashed':
      case 'withdrawal_possible': // already exited
      case 'withdrawal_done': // already exited
        logger.debug('Validator has exited already, skipping')
        return true
      default:
        logger.debug('Validator is not exiting yet')
        return false
    }
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
      `${CONSENSUS_NODE}/eth/v1/beacon/pool/voluntary_exits`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      }
    )
    // TODO: может сработать ретрай
    if (!req.ok) {
      const { message } = (await req.json()) as { message: string }
      throw new Error(message)
    }
  }
  return {
    genesis,
    state,
    validatorIndex,
    validatorPubkey,
    isExiting,
    exitRequest,
  }
}
