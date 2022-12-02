import fs from 'fs/promises'

import bls from '@chainsafe/bls'

import { ssz } from '@lodestar/types'
import { fromHex, toHexString } from '@lodestar/utils'
import { DOMAIN_VOLUNTARY_EXIT } from '@lodestar/params'
import { computeDomain, computeSigningRoot } from '@lodestar/state-transition'

import { EthDoExitMessage, ExitMessage } from './types.js'
import { config, logger, consensusApi, executionApi } from '../lib.js'

const { MESSAGES_LOCATION } = config

export const loadMessages = async () => {
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

export const verifyMessages = async (
  messages: ExitMessage[]
): Promise<void> => {
  const genesis = await consensusApi.genesis()
  const state = await consensusApi.state()

  for (const m of messages) {
    const { message, signature: rawSignature } = m
    const { validator_index: validatorIndex, epoch } = message

    const pubKey = fromHex(await consensusApi.validatorPubkey(validatorIndex))
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
        epoch: parseInt(epoch, 10),
        validatorIndex: parseInt(validatorIndex, 10),
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

export const processExit = async (messages: ExitMessage[], pubKey: string) => {
  if (await consensusApi.isExiting(pubKey)) return

  const validatorIndex = await consensusApi.validatorIndex(pubKey)
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
    await consensusApi.exitRequest(message)
    logger.log('Message sent successfully to exit', pubKey)
  } catch (e) {
    logger.log(
      'fetch to consensus node failed with',
      e instanceof Error ? e.message : e
    )
  }
}

export const loadExitEvents = async (toBlock: number, blocksBehind: number) => {
  const fromBlock = toBlock - blocksBehind
  return await executionApi.logs(fromBlock, toBlock)
}
