import bls from '@chainsafe/bls'
import { decrypt } from '@chainsafe/bls-keystore'
import { createHash } from 'crypto'

import { ssz } from '@lodestar/types'
import { fromHex, toHexString } from '@lodestar/utils'
import { DOMAIN_VOLUNTARY_EXIT } from '@lodestar/params'
import { computeDomain, computeSigningRoot } from '@lodestar/state-transition'

import { encryptedMessageDTO, exitOrEthDoExitDTO } from './dto.js'

import type { LoggerService } from 'lido-nanolib'
import type {
  LocalFileReaderService,
  MessageFile,
} from '../local-file-reader/service.js'
import type { ConsensusApiService } from '../consensus-api/service.js'
import type { ConfigService } from '../config/service.js'
import type { MetricsService } from '../prom/service.js'
import type { S3StoreService } from '../s3-store/service.js'
import type { GsStoreService } from '../gs-store/service.js'
import type { MessageStorage } from '../job-processor/message-storage.js'
import type { ExitMessageWithMetadata } from '../job-processor/service.js'

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
  const invalidExitMessageFiles = new Set<string>()

  const load = async (messagesStorage: MessageStorage) => {
    if (!config.MESSAGES_LOCATION) {
      logger.debug('Skipping loading messages in webhook mode')
      return []
    }

    logger.info(`Loading messages from '${config.MESSAGES_LOCATION}' folder`)

    const folder = await readFolder(config.MESSAGES_LOCATION)

    const messagesWithMetadata: ExitMessageWithMetadata[] = []

    logger.info('Parsing loaded messages')

    for (const [ix, messageFile] of folder.entries()) {
      logger.info(`${ix + 1}/${folder.length}`)

      // skipping empty files
      if (messageFile.content === '') {
        logger.warn(`Empty file. Skipping...`)
        invalidExitMessageFiles.add(messageFile.filename)
        continue
      }

      // used for uniqueness of file contents
      const fileChecksum = createHash('sha256')
        .update(messageFile.content)
        .digest('hex')

      if (messagesStorage.hasMessageWithChecksum(fileChecksum)) {
        logger.info(`File already loaded`)
        continue
      }

      let json: Record<string, unknown>
      try {
        json = JSON.parse(messageFile.content)
      } catch (error) {
        logger.warn(`Unparseable JSON in file ${messageFile.filename}`, error)
        invalidExitMessageFiles.add(messageFile.filename)
        continue
      }

      if ('crypto' in json) {
        try {
          json = await decryptMessage(json)
        } catch (e) {
          logger.warn(
            `Unable to decrypt encrypted file: ${messageFile.filename}`
          )
          invalidExitMessageFiles.add(messageFile.filename)
          continue
        }
      }

      let validated: ExitMessage | EthDoExitMessage

      try {
        validated = exitOrEthDoExitDTO(json)
      } catch (e) {
        logger.error(`${messageFile.filename} failed validation:`, e)
        invalidExitMessageFiles.add(messageFile.filename)
        continue
      }

      const message = 'exit' in validated ? validated.exit : validated
      messagesWithMetadata.push({
        data: message,
        meta: { fileChecksum: fileChecksum, filename: messageFile.filename },
      })

      // Unblock event loop for http server responses
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    logger.info(`Loaded ${messagesWithMetadata.length} new messages`)

    return messagesWithMetadata
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

  const verify = async (
    messages: ExitMessageWithMetadata[]
  ): Promise<ExitMessageWithMetadata[]> => {
    if (!config.MESSAGES_LOCATION) {
      logger.debug('Skipping messages validation in webhook mode')
      return []
    }

    logger.info('Validating messages')

    const genesis = await consensusApi.genesis()
    const state = await consensusApi.state()

    const validMessagesWithMetadata: ExitMessageWithMetadata[] = []

    for (const [ix, m] of messages.entries()) {
      logger.info(`${ix + 1}/${messages.length}`)

      const { message, signature: rawSignature } = m.data
      const { validator_index: validatorIndex, epoch } = message

      let validatorInfo: { pubKey: string; isExiting: boolean }
      try {
        validatorInfo = await consensusApi.validatorInfo(validatorIndex)
      } catch (e) {
        logger.error(
          `Failed to get validator info for index ${validatorIndex}`,
          e
        )
        invalidExitMessageFiles.add(m.meta.filename)
        continue
      }

      if (validatorInfo.isExiting) {
        logger.debug(`${validatorInfo.pubKey} exiting(ed), skipping validation`)
        // Assuming here in order to make this optimisation work
        // (if val exited this message had to be valid)
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
        invalidExitMessageFiles.add(m.meta.filename)
        continue
      }

      validMessagesWithMetadata.push(m)
    }

    logger.info('Finished validation', {
      validAmount: validMessagesWithMetadata.length,
    })

    return validMessagesWithMetadata
  }

  const exit = async (
    messageStorage: MessageStorage,
    event: { validatorPubkey: string; validatorIndex: string }
  ) => {
    const message = messageStorage.findByValidatorIndex(event.validatorIndex)

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

  const readFolder = async (uri: string): Promise<MessageFile[]> => {
    if (uri.startsWith('s3://')) return s3Service.read(uri)
    if (uri.startsWith('gs://')) return gsService.read(uri)
    return localFileReader.readFilesFromFolder(uri)
  }

  const loadToMemoryStorage = async (
    messagesStorage: MessageStorage
  ): Promise<{
    updated: number
    added: number
  }> => {
    invalidExitMessageFiles.clear()

    const newMessages = await load(messagesStorage)

    const verifiedNewMessages = await verify(newMessages)

    messagesStorage.removeOldMessages()

    const stats = messagesStorage.updateMessages(verifiedNewMessages)

    // updating metrics
    metrics.exitMessages.reset()
    metrics.exitMessages.labels('true').inc(messagesStorage.size)
    metrics.exitMessages.labels('false').inc(invalidExitMessageFiles.size)

    return stats
  }

  return { exit, loadToMemoryStorage }
}
