import bls from '@chainsafe/bls'

import { ssz } from '@lodestar/types'
import { fromHex, toHexString } from '@lodestar/utils'
import { DOMAIN_VOLUNTARY_EXIT } from '@lodestar/params'
import { computeDomain, computeSigningRoot } from '@lodestar/state-transition'

import { makeLogger } from 'tooling-nanolib-test'
import { exitOrEthDoExitDTO } from './dto.js'

import type { ReaderService } from '../reader/service.js'
import type { ConsensusApiService } from '../consensus-api/service.js'
import type { ConfigService } from '../config/service.js'

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

export type MessagesProcessorService = ReturnType<typeof makeMessagesProcessor>

export const makeMessagesProcessor = ({
  logger,
  config,
  reader,
  consensusApi,
}: {
  logger: ReturnType<typeof makeLogger>
  config: ConfigService
  reader: ReaderService
  consensusApi: ConsensusApiService
}) => {
  const load = async () => {
    const folder = await reader.dir(config.MESSAGES_LOCATION)
    const messages: ExitMessage[] = []

    for (const file of folder) {
      if (!file.endsWith('.json')) {
        logger.warn(
          `File with invalid extension found in messages folder: ${file}`
        )
        continue
      }
      const read = await reader.file(`${config.MESSAGES_LOCATION}/${file}`)
      let parsed: EthDoExitMessage | ExitMessage
      try {
        const json = JSON.parse(read.toString())
        parsed = exitOrEthDoExitDTO(json)
      } catch (error) {
        logger.warn(`Unparseable JSON in file ${file}`, error)
        continue
      }
      const message = 'exit' in parsed ? parsed.exit : parsed
      messages.push(message)
    }

    return messages
  }

  const verify = async (messages: ExitMessage[]): Promise<void> => {
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

  const exit = async (messages: ExitMessage[], pubKey: string) => {
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

  return { load, verify, exit }
}
