import { makeLogger } from 'lido-nanolib'
import { makeRequest } from 'lido-nanolib'
import {
  logger as loggerMiddleware,
  notOkError,
  retry,
  abort,
  prom,
} from 'lido-nanolib'
import { makeJobRunner } from 'lido-nanolib'

import dotenv from 'dotenv'

import { makeConfig, makeLoggerConfig } from '../services/config/service.js'
import { makeConsensusApi } from '../services/consensus-api/service.js'
import { makeExecutionApi } from '../services/execution-api/service.js'
import { makeMetrics, register } from '../services/prom/service.js'
import { makeLocalFileReader } from '../services/local-file-reader/service.js'
import { makeMessagesProcessor } from '../services/messages-processor/service.js'
import { makeHttpHandler } from '../services/http-handler/service.js'
import { makeAppInfoReader } from '../services/app-info-reader/service.js'
import { makeJobProcessor } from '../services/job-processor/service.js'
import { makeWebhookProcessor } from '../services/webhook-caller/service.js'
import { makeS3Store } from '../services/s3-store/service.js'
import { makeGsStore } from '../services/gs-store/service.js'
import { makeApp } from './service.js'
import { makeMessageReloader } from '../services/message-reloader/message-reloader.js'
import { makeForkVersionResolver } from '../services/fork-version-resolver/service.js'

dotenv.config()

export const makeAppModule = async () => {
  const loggerConfig = makeLoggerConfig({ env: process.env })

  const logger = makeLogger({
    level: loggerConfig.LOGGER_LEVEL,
    format: loggerConfig.LOGGER_FORMAT,
    sanitizer: {
      secrets: loggerConfig.LOGGER_SECRETS,
      replacer: '<secret>',
    },
  })

  const config = makeConfig({ logger, env: process.env })

  const metrics = makeMetrics({ PREFIX: config.PROM_PREFIX })

  const executionApi = makeExecutionApi(
    makeRequest([
      retry(3),
      loggerMiddleware(logger),
      prom(metrics.executionRequestDurationSeconds),
      notOkError(),
      abort(30_000),
    ]),
    logger,
    config,
    metrics
  )

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

  const webhookProcessor = makeWebhookProcessor(
    makeRequest([loggerMiddleware(logger), notOkError(), abort(10_000)]),
    logger,
    metrics
  )

  const messageReloader = makeMessageReloader({
    logger,
    config,
    messagesProcessor,
    forkVersionResolver,
  })

  const jobProcessor = makeJobProcessor({
    logger,
    config,
    messageReloader,
    executionApi,
    consensusApi,
    messagesProcessor,
    webhookProcessor,
    metrics,
  })

  const job = makeJobRunner('validator-ejector', {
    config,
    logger,
    metric: metrics.jobEjectorCycleDuration,
    handler: jobProcessor.handleJob,
  })

  const httpHandler = makeHttpHandler({ register, config })

  const appInfoReader = makeAppInfoReader({ localFileReader })

  const app = makeApp({
    config,
    logger,
    job,
    messageReloader,
    metrics,
    httpHandler,
    executionApi,
    consensusApi,
    appInfoReader,
  })

  return {
    async run() {
      await app.run()
    },
    async destroy() {
      app.stop()
    },
  }
}
