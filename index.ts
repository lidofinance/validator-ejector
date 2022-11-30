import fs from 'fs/promises'

import { ethers } from 'ethers'
import bls from '@chainsafe/bls'

import {
  pollingLastBlocksDurationSeconds,
  serveMetrics,
  config,
  logger,
} from './lib.js'

const {
  EXECUTION_NODE,
  CONSENSUS_NODE,
  CONTRACT_ADDRESS,
  OPERATOR_ID,
  BLOCKS_PRELOAD,
  BLOCKS_LOOP,
  SLEEP,
  MESSAGES_LOCATION,
  RUN_METRICS,
  METRICS_PORT,
  DRY_RUN,
} = config

process.on('SIGINT', () => {
  logger.info('Shutting down')
  process.exit(0)
})

import { ssz } from '@lodestar/types'
import { fromHex, toHexString } from '@lodestar/utils'
import { DOMAIN_VOLUNTARY_EXIT } from '@lodestar/params'
import { computeDomain, computeSigningRoot } from '@lodestar/state-transition'
import { ValidatorExitBus__factory } from './lib/abi/index.js'

const sleep = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000))

type ExitMessage = {
  message: {
    epoch: string
    validator_index: string
  }
  signature: string
}

type EthDoExitMessage = {
  exit: ExitMessage
  fork_version: string
}

const provider = new ethers.providers.JsonRpcProvider(EXECUTION_NODE)
const contract = ValidatorExitBus__factory.connect(CONTRACT_ADDRESS, provider)
const lastBlock = (await provider.getBlock('finalized')).number

const loadMessages = async () => {
  const folder = await fs.readdir(MESSAGES_LOCATION)
  const messages: (ExitMessage | EthDoExitMessage)[] = []
  for (const file of folder) {
    const read = await fs.readFile(`${MESSAGES_LOCATION}/${file}`)
    const parsed = JSON.parse(read.toString())
    // Accounting for both ethdo and raw formats
    messages.push(parsed.exit ? parsed.exit : parsed)
  }
  return messages as ExitMessage[]
}

const verifyMessages = async (messages: ExitMessage[]): Promise<void> => {
  const genesis = await getGenesis()
  const state = await getState()

  for (const m of messages) {
    const { message, signature: rawSignature } = m
    const { validator_index: validatorIndex, epoch } = message

    const pubKey = fromHex(await getValidatorPubkey(validatorIndex))
    const signature = fromHex(rawSignature)

    const GENESIS_VALIDATORS_ROOT = fromHex(genesis.genesis_validators_root)
    const CURRENT_FORK = fromHex(state.current_version)
    const PREVIOUS_FORK = fromHex(state.previous_version)

    const verifyFork = (fork: Uint8Array) => {
      const domain = computeDomain(
        DOMAIN_VOLUNTARY_EXIT,
        fork,
        GENESIS_VALIDATORS_ROOT
      )

      const parsedExit = {
        epoch: parseInt(epoch),
        validatorIndex: parseInt(validatorIndex),
      }

      const signingRoot = computeSigningRoot(
        ssz.phase0.VoluntaryExit,
        parsedExit,
        domain
      )

      const isValid = bls.verify(pubKey, signingRoot, signature)

      logger.debug(
        `Singature ${
          isValid ? 'valid' : 'invalid'
        } for validator ${validatorIndex} for fork ${toHexString(fork)}`
      )

      return isValid
    }

    let isValid = false

    isValid = verifyFork(CURRENT_FORK)
    if (!isValid) isValid = verifyFork(PREVIOUS_FORK)

    if (!isValid)
      logger.error(`Invalid signature for validator ${validatorIndex}`)
  }
}

const getGenesis = async () => {
  const req = await fetch(CONSENSUS_NODE + '/eth/v1/beacon/genesis')
  const res = await req.json()

  type GenesisData = {
    genesis_time: string
    genesis_validators_root: string
    genesis_fork_version: string
  }
  const genesis: GenesisData = res.data
  logger.debug('fetched genesis data')
  return genesis
}

const getState = async () => {
  const req = await fetch(
    CONSENSUS_NODE + '/eth/v1/beacon/states/finalized/fork'
  )
  const res = await req.json()

  type StateData = {
    previous_version: string
    current_version: string
    epoch: string
  }
  const state: StateData = res.data
  logger.debug('fetched state data')
  return state
}

const getValidatorIndex = async (pubKey: string) => {
  const req = await fetch(
    CONSENSUS_NODE + '/eth/v1/beacon/states/finalized/validators/' + pubKey
  )
  const res = await req.json()

  const validatorIndex = res.data.index
  logger.debug(`Validator index for ${pubKey} is ${validatorIndex}`)
  return validatorIndex
}

const getValidatorPubkey = async (validatorIndex: string) => {
  const req = await fetch(
    CONSENSUS_NODE +
      '/eth/v1/beacon/states/finalized/validators/' +
      validatorIndex
  )
  const res = await req.json()

  const pubKey: string = res.data.validator.pubkey
  logger.debug(`Validator pubkey for ${validatorIndex} is ${pubKey}`)
  return pubKey
}

const loadAndProcess = async (
  messages: ExitMessage[],
  eventsNumber: number
) => {
  const end = pollingLastBlocksDurationSeconds.startTimer()
  const events = await loadEvents(eventsNumber)
  logger.debug(`Loaded ${events.length} events`)
  const filteredEvents = filterEvents(events)
  logger.debug(`Filtered to ${filteredEvents.length} for us`)

  for (const event of filteredEvents) {
    logger.debug(`Handling exit for ${event.args?.validatorPubkey}`)
    await processExit(messages, event.args?.validatorPubkey)
  }
  end({ eventsNumber })
}

const loadEvents = async (blocksBehind: number) => {
  const filter = contract.filters['ValidatorExitfetch'](null, OPERATOR_ID)
  const startBlock = lastBlock - blocksBehind
  const logs = await contract.queryFilter(filter, startBlock, lastBlock)
  return logs
}

const filterEvents = (events: ethers.Event[]) =>
  events.filter(
    (event) => event.args?.nodeOperatorId.toString() === OPERATOR_ID
  )

const isExiting = async (pubkey: string) => {
  const req = await fetch(
    CONSENSUS_NODE + '/eth/v1/beacon/states/finalized/validators/' + pubkey
  )
  const res = await req.json()

  switch (res.data.status) {
    case 'active_exiting':
      logger.debug('Validator is exiting already, skipping')
      return true
    case 'exited_unslashed':
      logger.debug('Validator has exited already, skipping')
      return true
    case 'exited_slashed':
      logger.debug('Validator has exited already, skipping')
      return true
    case 'withdrawal_possible': // already exited
      logger.debug('Validator has exited already, skipping')
      return true
    case 'withdrawal_done': // already exited
      logger.debug('Validator has exited already, skipping')
      return true
    default:
      logger.debug('Validator is not exiting yet')
      return false
  }
}

const processExit = async (messages: ExitMessage[], pubKey: string) => {
  if (await isExiting(pubKey)) return

  const validatorIndex = await getValidatorIndex(pubKey)
  const message = messages.find(
    (msg) => msg.message.validator_index === validatorIndex
  )

  if (!message) {
    logger.error(
      'Validator needs to be exited but required message was not found / accessible!'
    )
    return
  }

  try {
    await sendExitfetch(message)
    logger.log('Message sent successfully to exit', pubKey)
  } catch (e) {
    logger.log(
      'fetch to consensus node failed with',
      e instanceof Error ? e.message : e
    )
  }
}

const sendExitfetch = async (message: ExitMessage) => {
  if (DRY_RUN) {
    logger.info('Not sending an exit in a dry run mode')
    return
  }

  const req = await fetch(
    CONSENSUS_NODE + '/eth/v1/beacon/pool/voluntary_exits',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    }
  )

  if (!req.ok) {
    const message = (await req.json()).message
    throw new Error(message)
  }
}

if (RUN_METRICS && METRICS_PORT) {
  serveMetrics(METRICS_PORT)
}
console.log('???')
logger.log(`Loading messages from ${MESSAGES_LOCATION}`)
const messages = await loadMessages()
logger.log(`Loaded ${messages.length} messages`)
await verifyMessages(messages)
logger.log('Validated messages')

logger.log(`Starting, searching only for fetchs for operator ${OPERATOR_ID}`)

logger.log(`fetching historical events for ${BLOCKS_PRELOAD} blocks`)
await loadAndProcess(messages, BLOCKS_PRELOAD)
await sleep(SLEEP)

logger.log('Starting a polling loop for new data')
do {
  logger.log(`Polling ${BLOCKS_LOOP} last blocks for events`)
  await loadAndProcess(messages, BLOCKS_LOOP)
  logger.log(`Sleeping for ${SLEEP} seconds`)
  await sleep(SLEEP)
} while (true)
