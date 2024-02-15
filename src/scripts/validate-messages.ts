import dotenv from 'dotenv'
import { makeLogger, makeRequest } from 'lido-nanolib'
import { logger as loggerMiddleware, retry, abort, prom } from 'lido-nanolib'
import { makeValidationConfig } from '../services/config/service.js'
import { makeConsensusApi } from '../services/consensus-api/service.js'
import { makeMetrics } from '../services/prom/service.js'
import { makeForkVersionResolver } from '../services/fork-version-resolver/service.js'
import { makeLocalFileReader } from '../services/local-file-reader/service.js'
import { makeS3Store } from '../services/s3-store/service.js'
import { makeGsStore } from '../services/gs-store/service.js'
import { makeMessagesProcessor } from '../services/messages-processor/service.js'
import { MessageStorage } from '../services/job-processor/message-storage.js'

dotenv.config()

const prepareDeps = () => {
  const logger = makeLogger({
    level: 'error',
    format: 'simple',
  })

  const config = makeValidationConfig({ env: process.env })

  const metrics = makeMetrics({ PREFIX: 'validation_script' })
  const consensusApi = makeConsensusApi(
    makeRequest([
      retry(3),
      loggerMiddleware(logger),
      prom(metrics.consensusRequestDurationSeconds),
      abort(30_000),
    ]),
    logger,
    config
  )

  const forkVersionResolver = makeForkVersionResolver(consensusApi, logger)

  const localFileReader = makeLocalFileReader({ logger })

  const s3Service = makeS3Store({ logger })
  const gsService = makeGsStore({ logger })

  const messagesProcessor = makeMessagesProcessor({
    logger,
    config,
    localFileReader,
    consensusApi,
    metrics,
    s3Service,
    gsService,
  })

  const infoLogger = makeLogger({
    level: 'info',
    format: 'simple',
  })

  return { messagesProcessor, logger: infoLogger, forkVersionResolver }
}

const run = async () => {
  const { messagesProcessor, logger, forkVersionResolver } = prepareDeps()

  const messageStorage = new MessageStorage()

  const forkInfo = await forkVersionResolver.getForkVersionInfo()

  const { added, invalidExitMessageFiles } =
    await messagesProcessor.loadToMemoryStorage(messageStorage, {
      ...forkInfo,
      // set isDencun true to check the validity of the messages
      isDencun: true,
    })

  const total = added + invalidExitMessageFiles.size

  if (total < 1) {
    logger.error(
      `Couldn't find the messages, are you sure you entered the correct path?`
    )
    process.exit(1)
  }

  logger.info(`total messages: ${total}`)
  logger.info(`valid messages: ${added}`)

  if (invalidExitMessageFiles.size) {
    logger.warn(`invalid messages: ${invalidExitMessageFiles.size}`)
    logger.warn('invalid messages files', Array.from(invalidExitMessageFiles))
  } else {
    logger.info(`invalid messages: ${invalidExitMessageFiles.size}`)
  }
}

run().catch(console.error)
