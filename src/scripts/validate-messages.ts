import dotenv from 'dotenv'
import { makeLogger, makeRequest } from 'lido-nanolib'
import { logger as loggerMiddleware, retry, abort, prom } from 'lido-nanolib'
import { makeConfig, makeLoggerConfig } from '../services/config/service.js'
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
  const loggerConfig = makeLoggerConfig({ env: process.env })

  const logger = makeLogger({
    level: 'error',
    format: loggerConfig.LOGGER_FORMAT,
    sanitizer: {
      secrets: loggerConfig.LOGGER_SECRETS,
      replacer: '<secret>',
    },
  })

  const config = makeConfig({ logger, env: process.env })

  const metrics = makeMetrics({ PREFIX: config.PROM_PREFIX })
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
    forkVersionResolver,
  })

  const infoLogger = makeLogger({
    level: 'info',
    format: loggerConfig.LOGGER_FORMAT,
    sanitizer: {
      secrets: loggerConfig.LOGGER_SECRETS,
      replacer: '<secret>',
    },
  })

  return { messagesProcessor, logger: infoLogger }
}

const run = async () => {
  const { messagesProcessor, logger } = prepareDeps()

  const messageStorage = new MessageStorage()

  const { added, invalidExitMessageFiles } =
    await messagesProcessor.loadToMemoryStorage(messageStorage)

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
