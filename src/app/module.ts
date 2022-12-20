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
import { makeMetrics } from '../services/prom/service.js'
import { makeReader } from '../services/reader/service.js'
import { makeMessagesProcessor } from '../services/messages-processor/service.js'

import { makeApp } from './service.js'

dotenv.config()

export const bootstrap = async () => {
  const loggerConfig = makeLoggerConfig({ env: process.env })

  const logger = makeLogger({
    level: loggerConfig.LOGGER_LEVEL,
    format: loggerConfig.LOGGER_FORMAT,
  })

  try {
    const config = makeConfig({ logger, env: process.env })

    const metrics = makeMetrics(config)

    const executionApi = makeExecutionApi(
      makeRequest([
        retry(3),
        loggerMiddleware(logger),
        prom(metrics.executionRequestDurationSeconds),
        notOkError(),
        abort(5000),
      ]),
      logger,
      config
    )

    const consensusApi = makeConsensusApi(
      makeRequest([
        retry(3),
        loggerMiddleware(logger),
        prom(metrics.consensusRequestDurationSeconds),
        abort(5000),
      ]),
      logger,
      config
    )

    const reader = makeReader()

    const messagesProcessor = makeMessagesProcessor({
      logger,
      config,
      reader,
      consensusApi,
      executionApi,
      metrics,
    })

    const job = makeJobRunner('validator-ejector', {
      config,
      logger,
      metric: metrics.jobDuration,
      handler: messagesProcessor.proceed,
    })

    const app = makeApp({
      config,
      logger,
      executionApi,
      job,
      messagesProcessor,
      metrics,
    })

    await app.run()
  } catch (error) {
    logger.error('Startup error', error)
    process.exit(1)
  }
}
