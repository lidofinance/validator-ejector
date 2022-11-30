import { makeLogger } from '../logger/index.js'
import { makeRequest } from '../request/index.js'

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

export const makeApi = (
  request: ReturnType<typeof makeRequest>,
  logger: ReturnType<typeof makeLogger>,
  { CONSENSUS_NODE, DRY_RUN }: { CONSENSUS_NODE: string; DRY_RUN: boolean }
) => {
  const genesis = async () => {
    const res = await request(`${CONSENSUS_NODE}/eth/v1/beacon/genesis`)
    const json = (await res.json()) as { data: GenesisData }
    logger.debug('fetched genesis data')
    return json.data
  }

  const state = async () => {
    const res = await request(
      `${CONSENSUS_NODE}/eth/v1/beacon/states/finalized/fork`
    )
    const json = (await res.json()) as { data: StateData }
    logger.debug('fetched state data')
    return json.data
  }

  const validatorIndex = async (pubKey: string) => {
    const res = await request(
      `${CONSENSUS_NODE}/eth/v1/beacon/states/finalized/validators/${pubKey}`
    )
    const json = (await res.json()) as { data: { index: string } }
    const validatorIndex = json.data.index
    logger.debug(`Validator index for ${pubKey} is ${validatorIndex}`)
    return validatorIndex
  }

  const validatorPubkey = async (validatorIndex: string) => {
    const res = await request(
      `${CONSENSUS_NODE}/eth/v1/beacon/states/finalized/validators/${validatorIndex}`
    )
    const json = (await res.json()) as {
      data: { validator: { pubkey: string } }
    }

    const pubKey: string = json.data.validator.pubkey
    logger.debug(`Validator pubkey for ${validatorIndex} is ${pubKey}`)
    return pubKey
  }

  const isExiting = async (pubkey: string) => {
    const req = await request(
      `${CONSENSUS_NODE}/eth/v1/beacon/states/finalized/validators/${pubkey}`
    )
    const res = (await req.json()) as { data: { status: string } }

    switch (res.data.status) {
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
      `${CONSENSUS_NODE}/eth/v1/beacon/pool/voluntary_exits`
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
