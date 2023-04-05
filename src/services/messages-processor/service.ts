import bls from '@chainsafe/bls'
import { decrypt } from '@chainsafe/bls-keystore'

import { ssz } from '@lodestar/types'
import { fromHex, toHexString } from '@lodestar/utils'
import { DOMAIN_VOLUNTARY_EXIT } from '@lodestar/params'
import { computeDomain, computeSigningRoot } from '@lodestar/state-transition'

import { encryptedMessageDTO, exitOrEthDoExitDTO } from './dto.js'

import type { LoggerService } from 'lido-nanolib'
import type { ReaderService } from '../reader/service.js'
import type { ConsensusApiService } from '../consensus-api/service.js'
import type { ConfigService } from '../config/service.js'
import type { MetricsService } from '../prom/service.js'
import type { S3StoreService } from '../s3-store/service.js'
import type { GsStoreService } from '../gs-store/service.js'

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
  metrics,
  s3Service,
  gsService,
}: {
  logger: LoggerService
  config: ConfigService
  reader: ReaderService,
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

    logger.info(`Loading messages from ${config.MESSAGES_LOCATION}`)

    if (!(await reader.dirExists(config.MESSAGES_LOCATION))) {
      logger.error('Messages directory is not accessible, exiting...')
      process.exit()
    }

    // const folder = await reader.dir(config.MESSAGES_LOCATION)
    const messages: ExitMessage[] = []

    const reads: string[] = []
    if (await reader.dirExists(config.MESSAGES_LOCATION)) {
      const folder = await reader.dir(config.MESSAGES_LOCATION)
      for (const file of folder) {
        if (!file.endsWith('.json')) {
          logger.warn(
            `File with invalid extension found in messages folder: ${file}`
          )
        }
        const read = await reader.file(`${config.MESSAGES_LOCATION}/${file}`)
        reads.push(read.toString())
      }
    }
    for (const file of config.MESSAGES_LOCATIONS) {
      try {
        const read = await readFile(file)
        reads.push(read.toString())
      } catch (error) {
        logger.warn(`Unparseable read file ${file}`, error)
        continue
      }
    }


    for (const read of reads) {
      let json: Record<string, unknown>
      try {
        json = JSON.parse(read)
      } catch (error) {
        logger.warn(`Unparseable JSON`, error)
        metrics.exitMessages.inc({
          valid: 'false',
        })
        continue
      }

      if ('crypto' in json) {
        try {
          json = await decryptMessage(json)
        } catch (e) {
          logger.warn(`Unable to decrypt`)
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
        logger.error(`failed validation:`, e)
        metrics.exitMessages.inc({
          valid: 'false',
        })
        continue
      }

      const message = 'exit' in validated ? validated.exit : validated
      messages.push(message)
    }

    logger.info(`Loaded ${messages.length} messages`)

    return messages
  }

  const readFile = async (uri: string): Promise<string> => {
    return uri.startsWith('s3://') ? s3Service.read(uri) : gsService.read(uri)
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

  return { load, verify, exit }
}
