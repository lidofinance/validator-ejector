import bls from '@chainsafe/bls'
import { decrypt } from '@chainsafe/bls-keystore'

import { ssz } from '@lodestar/types'
import { fromHex, toHexString } from '@lodestar/utils'
import { DOMAIN_VOLUNTARY_EXIT } from '@lodestar/params'
import { computeDomain, computeSigningRoot } from '@lodestar/state-transition'

import { encryptedMessageDTO, exitOrEthDoExitDTO } from './dto.js'

import type { LoggerService } from 'lido-nanolib'
import type { LocalFileReaderService } from '../local-file-reader/service.js'
import type { ConsensusApiService } from '../consensus-api/service.js'
import type { ConfigService } from '../config/service.js'
import type { MetricsService } from '../prom/service.js'
import type { S3StoreService } from '../s3-store/service.js'
import type { GsStoreService } from '../gs-store/service.js'
import type { MessageStorage } from '../job-processor/message-storage.js'

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
  localFileReader,
  consensusApi,
  metrics,
  s3Service,
  gsService,
}: {
  logger: LoggerService
  config: ConfigService
  localFileReader: LocalFileReaderService
  consensusApi: ConsensusApiService
  metrics: MetricsService
  s3Service: S3StoreService
  gsService: GsStoreService
}) => {
  const load = async () => {
    if (!config.MESSAGES_LOCATION) {
      logger.debug('Skipping loading messages in webhook mode')
      return []
    }

    logger.info(`Loading messages from '${config.MESSAGES_LOCATION}' folder`)

    const folder = await readFolder(config.MESSAGES_LOCATION)

    const messages: ExitMessage[] = []

    logger.info('Parsing loaded messages')

    for (const [ix, file] of folder.entries()) {
      logger.info(`${ix + 1}/${folder.length}`)

      let json: Record<string, unknown>
      try {
        json = JSON.parse(file)
      } catch (error) {
        logger.warn(`Unparseable JSON in file ${file}`, error)
        metrics.exitMessages.inc({
          valid: 'false',
        })
        continue
      }

      if ('crypto' in json) {
        try {
          json = await decryptMessage(json)
        } catch (e) {
          logger.warn(`Unable to decrypt encrypted file: ${file}`)
          metrics.exitMessages.inc({
            valid: 'false',
          })
          continue
        }
      }

      let validated: ExitMessage | EthDoExitMessage

      try {
        validated = exitOrEthDoExitDTO(json)
      } catch (e) {
        logger.error(`${file} failed validation:`, e)
        metrics.exitMessages.inc({
          valid: 'false',
        })
        continue
      }

      const message = 'exit' in validated ? validated.exit : validated
      messages.push(message)

      // Unblock event loop for http server responses
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    logger.info(`Loaded ${messages.length} messages`)

    return messages
  }

  const decryptMessage = async (input: Record<string, unknown>) => {
    if (!config.MESSAGES_PASSWORD) {
      throw new Error('Password was not supplied')
    }

    const checked = encryptedMessageDTO(input)

    const content = await decrypt(checked, config.MESSAGES_PASSWORD)

    const stringed = new TextDecoder().decode(content)

    let json: Record<string, unknown>
    try {
      json = JSON.parse(stringed)
    } catch {
      throw new Error('Unparseable JSON after decryption')
    }

    return json
  }

  const verify = async (messages: ExitMessage[]): Promise<ExitMessage[]> => {
    if (!config.MESSAGES_LOCATION) {
      logger.debug('Skipping messages validation in webhook mode')
      return []
    }

    logger.info('Validating messages')

    const genesis = await consensusApi.genesis()
    const state = await consensusApi.state()

    const validMessages: ExitMessage[] = []

    for (const [ix, m] of messages.entries()) {
      logger.info(`${ix + 1}/${messages.length}`)

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
        // Assuming here in order to make this optimisation work
        // (if val exited this message had to be valid)
        metrics.exitMessages.inc({
          valid: 'true',
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

  const exit = async (
    messageStorage: MessageStorage,
    event: { validatorPubkey: string; validatorIndex: string }
  ) => {
    const message = messageStorage.messages.find(
      (msg) => msg.message.validator_index === event.validatorIndex
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
        event
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

  const readFolder = async (uri: string): Promise<string[]> => {
    if (uri.startsWith('s3://')) return s3Service.read(uri)
    if (uri.startsWith('gs://')) return gsService.read(uri)
    return localFileReader.readFilesFromFolder(uri)
  }

  return { load, verify, exit }
}
