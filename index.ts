import { ethers } from 'ethers'
import fs from 'fs/promises'

import dotenv from 'dotenv'
dotenv.config()

const {
  EXECUTION_NODE,
  CONSENSUS_NODE,
  CONTRACT_ADDRESS,
  OPERATOR_ID,
  BLOCKS_PRELOAD,
  BLOCKS_LOOP,
  SLEEP,
  MESSAGES_LOCATION,
} = process.env

process.on('SIGINT', () => {
  console.info('Shutting down')
  process.exit(0)
})

const sleep = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000))

const provider = new ethers.providers.JsonRpcProvider(EXECUTION_NODE)
const abi = JSON.parse((await fs.readFile('ValidatorExitBus.json')).toString())
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider)
const lastBlock = (await provider.getBlock('finalized')).number

const loadAndProcess = async (eventsNumber: number) => {
  const events = await loadEvents(eventsNumber)
  const filteredEvents = filterEvents(events)
  for (const event of filteredEvents) {
    await processExit(event.args.validatorPubkey)
  }
}

const loadEvents = async (blocksBehind: number) => {
  const filter = contract.filters['ValidatorExitRequest'](null, OPERATOR_ID)
  const startBlock = lastBlock - blocksBehind
  const logs = await contract.queryFilter(filter, startBlock, lastBlock)
  console.debug(`Loaded ${logs.length}`)
  return logs
}

const filterEvents = (events: ethers.Event[]) =>
  events.filter((event) => event.args.nodeOperatorId.toString() === OPERATOR_ID)

const isExiting = async (pubkey: string) => {
  const req = await fetch(
    CONSENSUS_NODE + '/eth/v1/beacon/states/finalized/validators/' + pubkey
  )
  const res = await req.json()

  switch (res.data.status) {
    case 'active_exiting':
      return true
    case 'exited_unslashed':
      return true
    case 'exited_slashed':
      return true
    case 'withdrawal_possible': // already exited
      return true
    case 'withdrawal_done': // already exited
      return true
    default:
      return false
  }
}

const processExit = async (pubkey: string) => {
  if (await isExiting(pubkey)) return

  const file = await fs.readFile(`${MESSAGES_LOCATION}/${pubkey}.json`)

  if (!file) {
    console.error(
      'Validator needs to be exited but required file was not found / accessible!'
    )
    return
  }

  const parsed = JSON.parse(file.toString())

  try {
    // We can handle both ethdo format or raw
    await sendExitRequest((parsed.exit ? parsed.exit : parsed).toString())
    console.log('Message sent successfully to exit', pubkey)
  } catch (e) {
    console.log(
      'Request to consensus node failed with',
      e instanceof Error ? e.message : e
    )
  }
}

const sendExitRequest = async (message: string) => {
  const req = await fetch(
    CONSENSUS_NODE + '/eth/v1/beacon/pool/voluntary_exits',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: message,
    }
  )

  if (!req.ok) {
    const message = (await req.json()).message
    throw new Error(message)
  }
}

console.log(`Started, reacting only to requests for operator ${OPERATOR_ID}`)

console.log(`Fetching historical events for ${BLOCKS_PRELOAD} blocks`)
await loadAndProcess(parseInt(BLOCKS_PRELOAD))
await sleep(parseInt(SLEEP))

console.log('Starting a polling loop for new data')
do {
  console.log(`Polling ${BLOCKS_LOOP} last events`)
  await loadAndProcess(parseInt(BLOCKS_LOOP))
  console.log(`Sleeping for ${SLEEP} seconds`)
  await sleep(parseInt(SLEEP))
} while (true)
