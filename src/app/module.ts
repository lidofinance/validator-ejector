import { makeLogger } from 'tooling-nanolib-test'
import { makeRequest } from 'tooling-nanolib-test'
import {
  logger as loggerMiddleware,
  notOkError,
  retry,
  abort,
  prom,
} from 'tooling-nanolib-test'
import { makeJobRunner } from 'tooling-nanolib-test'

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
    pretty: loggerConfig.LOGGER_PRETTY,
  })

  try {
    const config = makeConfig({ logger, env: process.env })

    const metrics = makeMetrics(config)

    const consensusApi = makeConsensusApi(
      makeRequest([
        retry(3),
        loggerMiddleware(logger),
        prom(metrics.requestDurationSeconds),
        abort(5000),
      ]),
      logger,
      config
    )

    const executionApi = makeExecutionApi(
      makeRequest([
        retry(3),
        loggerMiddleware(logger),
        prom(metrics.requestDurationSeconds),
        notOkError(),
        abort(5000),
      ]),
      logger,
      config
    )

    const job = makeJobRunner('validator-ejector', {
      config,
      logger,
      metric: metrics.jobDuration,
      handler: async ({
        lastBlock,
        eventsNumber,
        messages,
      }: {
        eventsNumber: number
        lastBlock: number
        messages: any
      }) => {
        const pubKeys = await executionApi.loadExitEvents(
          lastBlock,
          eventsNumber
        )
        logger.debug(`Loaded ${pubKeys.length} events`)

        for (const pubKey of pubKeys) {
          logger.debug(`Handling exit for ${pubKey}`)
          await messagesProcessor.exit(messages, pubKey)
        }
      },
    })

    const reader = makeReader()

    const messagesProcessor = makeMessagesProcessor({
      logger,
      config,
      reader,
      consensusApi,
    })

    const app = makeApp({
      config,
      logger,
      executionApi,
      job,
      messagesProcessor,
    })

    await app.run()
  } catch (error) {
    logger.error('Startup error', error)
    process.exit(1)
  }
}
