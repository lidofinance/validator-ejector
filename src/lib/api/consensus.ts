import { makeLogger } from '../logger/index.js'
import { makeRequest } from '../request/index.js'
import { obj, str } from '../validator/index.js'

type ExitMessage = {
  message: {
    epoch: string
    validator_index: string
  }
  signature: string
}

type GenesisData = {
  genesis_time: string
  genesis_validators_root: string
  genesis_fork_version: string
}

type StateData = {
  previous_version: string
  current_version: string
  epoch: string
}

export const makeConsensusApi = (
  request: ReturnType<typeof makeRequest>,
  logger: ReturnType<typeof makeLogger>,
  { CONSENSUS_NODE, DRY_RUN }: { CONSENSUS_NODE: string; DRY_RUN: boolean }
) => {
  const genesis = async () => {
    const res = await request(`${CONSENSUS_NODE}/eth/v1/beacon/genesis`)
    const json = obj(
      await res.json(),
      'Empty response from consensus node genesis'
    )
    const jsonData = obj(
      json.data,
      'Empty data object from consensus node genesis'
    )
    const result: GenesisData = {
      genesis_time: str(jsonData.genesis_time, 'Invalid genesis_time input'),
      genesis_validators_root: str(
        jsonData.genesis_validators_root,
        'Invalid genesis_validators_root input'
      ),
      genesis_fork_version: str(
        jsonData.genesis_fork_version,
        'Invalid genesis_fork_version input'
      ),
    }
    logger.debug('fetched genesis data')
    return result
  }

  const state = async () => {
    const res = await request(
      `${CONSENSUS_NODE}/eth/v1/beacon/states/finalized/fork`
    )
    const json = obj(
      await res.json(),
      'Empty response from consensus node state'
    )
    const jsonData = obj(
      json.data,
      'Empty data object from consensus node state'
    )
    const result: StateData = {
      previous_version: str(
        jsonData.previous_version,
        'Invalid previous_version input'
      ),
      current_version: str(
        jsonData.current_version,
        'Invalid current_version input'
      ),
      epoch: str(jsonData.epoch, 'Invalid epoch input'),
    }
    logger.debug('fetched state data')
    return result
  }

  const validatorIndex = async (pubKey: string) => {
    const res = await request(
      `${CONSENSUS_NODE}/eth/v1/beacon/states/finalized/validators/${pubKey}`
    )
    const json = obj(
      await res.json(),
      'Empty response from consensus node validator index'
    )
    const jsonData = obj(
      json.data,
      'Empty data object from consensus node validator index'
    )
    const validatorIndex = str(jsonData.index, 'Invalid validator index')

    logger.debug(`Validator index for ${pubKey} is ${validatorIndex}`)
    return validatorIndex
  }

  const validatorPubkey = async (validatorIndex: string) => {
    const res = await request(
      `${CONSENSUS_NODE}/eth/v1/beacon/states/finalized/validators/${validatorIndex}`
    )
    const json = obj(
      await res.json(),
      'Empty response from consensus node validator pubKey'
    )
    const jsonData = obj(
      json.data,
      'Empty data object from consensus node validator pubKey'
    )
    const validator = obj(jsonData.validator, 'Invalid validator object')
    const pubKey = str(validator.pubkey, 'Invalid validator pubKey')

    logger.debug(`Validator pubkey for ${validatorIndex} is ${pubKey}`)
    return pubKey
  }

  const isExiting = async (pubkey: string) => {
    const res = await request(
      `${CONSENSUS_NODE}/eth/v1/beacon/states/finalized/validators/${pubkey}`
    )
    const json = obj(
      await res.json(),
      'Empty response from consensus node validator status'
    )
    const jsonData = obj(
      json.data,
      'Empty data object from consensus node validator status'
    )
    const status = str(jsonData.status, 'Invalid validator status')
    switch (status) {
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
  const exitRequest = async (message: ExitMessage) => {
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
