import bls from '@chainsafe/bls'

import { ssz } from '@lodestar/types'
import { fromHex, toHexString } from '@lodestar/utils'
import { DOMAIN_VOLUNTARY_EXIT } from '@lodestar/params'
import { computeDomain, computeSigningRoot } from '@lodestar/state-transition'

import { exitOrEthDoExitDTO } from './dto.js'

import type { LoggerService } from 'lido-nanolib'
import type { ReaderService } from '../reader/service.js'
import type { ConsensusApiService } from '../consensus-api/service.js'
import type { ExecutionApiService } from '../execution-api/service.js'
import type { ConfigService } from '../config/service.js'
import type { MetricsService } from '../prom/service.js'

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
  executionApi,
  metrics,
}: {
  logger: LoggerService
  config: ConfigService
  reader: ReaderService
  consensusApi: ConsensusApiService
  executionApi: ExecutionApiService
  metrics: MetricsService
}) => {
  const load = async () => {
    const folder = await reader.dir(config.MESSAGES_LOCATION)
    const messages: ExitMessage[] = []

    for (const file of folder) {
      if (!file.endsWith('.json')) {
        logger.warn(
          `File with invalid extension found in messages folder: ${file}`
        )
        metrics.exitMessages.inc({
          valid: 'false',
        })
        continue
      }
      const read = await reader.file(`${config.MESSAGES_LOCATION}/${file}`)
      let parsed: EthDoExitMessage | ExitMessage
      try {
        const json = JSON.parse(read.toString())
        parsed = exitOrEthDoExitDTO(json)
      } catch (error) {
        logger.warn(`Unparseable JSON in file ${file}`, error)
        metrics.exitMessages.inc({
          valid: 'false',
        })
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

      const validatorInfo = await consensusApi.validatorInfo(validatorIndex)

      if (validatorInfo.isExiting) {
        logger.debug(`${validatorInfo.pubKey} exiting(ed), skipping validation`)
        return
      }

      const pubKey = fromHex(validatorInfo.pubKey)
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

      metrics.exitMessages.inc({
        valid: isValid.toString(),
      })
    }
  }

  const exit = async (
    messages: ExitMessage[],
    pubKey: string,
    metrics: MetricsService
  ) => {
    if ((await consensusApi.validatorInfo(pubKey)).isExiting) {
      logger.debug(
        `Exit was initiated, but ${pubKey} is already exiting(ed), skipping`
      )
      return
    }

    const validatorIndex = (await consensusApi.validatorInfo(pubKey)).index
    const message = messages.find(
      (msg) => msg.message.validator_index === validatorIndex
    )

    if (!message) {
      logger.error(
        'Validator needs to be exited but required message was not found / accessible!'
      )
      metrics.exitActions.inc({ result: 'error' })
      return
    }

    try {
      await consensusApi.exitRequest(message)
      logger.info('Message sent successfully to exit', pubKey)
      metrics.exitActions.inc({ result: 'success' })
    } catch (e) {
      logger.error(
        'Failed to send out exit message',
        e instanceof Error ? e.message : e
      )
      metrics.exitActions.inc({ result: 'error' })
    }
  }

  const proceed = async ({
    lastBlock,
    eventsNumber,
    messages,
    metrics,
  }: {
    eventsNumber: number
    lastBlock: number
    messages: ExitMessage[]
    metrics: MetricsService
  }) => {
    logger.info('Job started')
    const pubKeys = await executionApi.loadExitEvents(lastBlock, eventsNumber)
    logger.debug(`Loaded ${pubKeys.length} events`)

    for (const pubKey of pubKeys) {
      logger.debug(`Handling exit for ${pubKey}`)
      await exit(messages, pubKey, metrics)
    }
    logger.info('Job finished')
  }

  return { load, verify, exit, proceed }
}
