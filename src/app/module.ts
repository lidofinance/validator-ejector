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
import { makeReader } from '../services/reader/service.js'
import { makeMessagesProcessor } from '../services/messages-processor/service.js'
import { makeHttpHandler } from '../services/http-handler/service.js'
import { makeAppInfoReader } from '../services/appInfoReader/service.js'
import { makeS3Store } from '../services/s3-store/service.js'
import { makeGsStore } from '../services/gs-store/service.js'

import { makeApp } from './service.js'

dotenv.config()

export const bootstrap = async () => {
  const defaultLogger = makeLogger({
    level: 'debug',
    format: 'simple',
  })

  try {
    const loggerConfig = makeLoggerConfig({ env: process.env })

    const sanitizer = loggerConfig.LOGGER_PASSWORD ? {
      secrets: loggerConfig.LOGGER_SECRETS,
      replacer: '<secret>',
    } : undefined
    const logger = makeLogger({
      level: loggerConfig.LOGGER_LEVEL,
      format: loggerConfig.LOGGER_FORMAT,
      sanitizer,
    })
    const config = makeConfig({ logger, env: process.env })

    const metrics = makeMetrics()

    const executionApi = makeExecutionApi(
      makeRequest([
        retry(3),
        loggerMiddleware(logger),
        prom(metrics.executionRequestDurationSeconds),
        notOkError(),
        abort(30_000),
      ]),
      logger,
      config
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

    const reader = makeReader()

    const s3Service = makeS3Store()
    const gsService = makeGsStore()

    const messagesProcessor = makeMessagesProcessor({
      logger,
      config,
      consensusApi,
      executionApi,
      metrics,
      s3Service,
      gsService,
    })

    const job = makeJobRunner('validator-ejector', {
      config,
      logger,
      metric: metrics.jobDuration,
      handler: messagesProcessor.runJob,
    })

    const httpHandler = makeHttpHandler({ register, config })

    const appInfoReader = makeAppInfoReader({ reader })

    const app = makeApp({
      config,
      logger,
      job,
      messagesProcessor,
      metrics,
      httpHandler,
      executionApi,
      consensusApi,
      appInfoReader,
    })

    await app.run()
  } catch (error) {
    defaultLogger.error('Startup error', error)
    process.exit(1)
  }
}
