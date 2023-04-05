import bls from '@chainsafe/bls'

import { ssz } from '@lodestar/types'
import { fromHex, toHexString } from '@lodestar/utils'
import { DOMAIN_VOLUNTARY_EXIT } from '@lodestar/params'
import { computeDomain, computeSigningRoot } from '@lodestar/state-transition'

import type { LoggerService } from 'lido-nanolib'
import type { ConsensusApiService } from '../consensus-api/service.js'
import type { ConfigService } from '../config/service.js'
import type { MetricsService } from '../prom/service.js'
import type { ExitMessage } from '../../interfaces/messages.js'

export type MessagesProcessorService = ReturnType<typeof makeMessagesProcessor>

export const makeMessagesProcessor = ({
  logger,
  config,
  consensusApi,
  metrics,
}: {
  logger: LoggerService
  config: ConfigService
  consensusApi: ConsensusApiService
  metrics: MetricsService
}) => {
  const verify = async (messages: ExitMessage[]): Promise<ExitMessage[]> => {
    if (!config.MESSAGES_LOCATION) {
      logger.debug('Skipping loading messages in webhook mode')
      return []
    }

    logger.info('Validating messages')

    const genesis = await consensusApi.genesis()
    const state = await consensusApi.state()

    const validMessages: ExitMessage[] = []

    for (const m of messages) {
      const { message, signature: rawSignature } = m
      const { validator_index: validatorIndex, epoch } = message

      let validatorInfo: { pubKey: string; isExiting: boolean }
      try {
        validatorInfo = await consensusApi.validatorInfo(validatorIndex)
      } catch (e) {
        logger.error(
          `Failed to get validator info for index ${validatorIndex}`,
          e
        )
        metrics.exitMessages.inc({
          valid: 'false',
        })
        continue
      }

      if (validatorInfo.isExiting) {
        logger.debug(`${validatorInfo.pubKey} exiting(ed), skipping validation`)
        metrics.exitMessages.inc({
          valid: 'false',
        })
        continue
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

      if (!isValid) {
        logger.error(`Invalid signature for validator ${validatorIndex}`)
        metrics.exitMessages.inc({
          valid: 'false',
        })
        continue
      }

      validMessages.push(m)

      metrics.exitMessages.inc({
        valid: 'true',
      })
    }

    logger.info('Finished validation', { validAmount: validMessages.length })

    return validMessages
  }

  const exit = async (messages: ExitMessage[], pubKey: string) => {
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
      logger.info(
        'Voluntary exit message sent successfully to Consensus Layer',
        { pubKey, validatorIndex }
      )
      metrics.exitActions.inc({ result: 'success' })
    } catch (e) {
      logger.error(
        'Failed to send out exit message',
        e instanceof Error ? e.message : e
      )
      metrics.exitActions.inc({ result: 'error' })
    }
  }

  return { verify, exit }
}
