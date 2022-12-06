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

import { makeConfig, makeLoggerConfig } from './lib/config/index.js'
import { makeConsensusApi, makeExecutionApi } from './lib/api/index.js'
import { metrics } from './lib/prom/index.js'
import { makeReader } from './lib/reader/index.js'
import { makeMessagesProcessor } from './lib/messages-loader/index.js'

export * from './lib/prom/index.js'

export const loggerConfig = makeLoggerConfig()

export const logger = makeLogger({
  level: loggerConfig.LOGGER_LEVEL,
  pretty: loggerConfig.LOGGER_PRETTY,
})

export const config = makeConfig({ logger })

export const request = makeRequest([
  retry(3),
  loggerMiddleware(logger),
  prom(metrics.requestDurationSeconds),
  notOkError(),
  abort(5000),
])

export const consensusApi = makeConsensusApi(request, logger, config)
export const executionApi = makeExecutionApi(request, logger, config)

export const jobRunner = makeJobRunner(
  'validator-ejector',
  { config, logger, metric: metrics.jobDuration },
  { start: config.BLOCKS_PRELOAD, pooling: config.BLOCKS_LOOP }
)

export const reader = makeReader()

export const messagesProcessor = makeMessagesProcessor({
  logger,
  config,
  reader,
  consensusApi,
})
