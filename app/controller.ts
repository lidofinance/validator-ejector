import fs from 'fs/promises'

import { ethers } from 'ethers'
import bls from '@chainsafe/bls'

import { ssz } from '@lodestar/types'
import { fromHex, toHexString } from '@lodestar/utils'
import { DOMAIN_VOLUNTARY_EXIT } from '@lodestar/params'
import { computeDomain, computeSigningRoot } from '@lodestar/state-transition'

import { EthDoExitMessage, ExitMessage } from './types.js'
import { config, logger, api } from '../lib.js'

const { OPERATOR_ID, MESSAGES_LOCATION } = config

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
  const genesis = await api.genesis()
  const state = await api.state()

  for (const m of messages) {
    const { message, signature: rawSignature } = m
    const { validator_index: validatorIndex, epoch } = message

    const pubKey = fromHex(await api.validatorPubkey(validatorIndex))
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

export const filterEvents = (events: ethers.Event[]) =>
  events.filter(
    (event) => event.args?.nodeOperatorId.toString() === OPERATOR_ID
  )

export const processExit = async (messages: ExitMessage[], pubKey: string) => {
  if (await api.isExiting(pubKey)) return

  const validatorIndex = await api.validatorIndex(pubKey)
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
    await api.exitRequest(message)
    logger.log('Message sent successfully to exit', pubKey)
  } catch (e) {
    logger.log(
      'fetch to consensus node failed with',
      e instanceof Error ? e.message : e
    )
  }
}
