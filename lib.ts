import { makeLogger } from './lib/logger/index.js'
import { makeRequest } from './lib/request/index.js'
import {
  logger as loggerMiddleware,
  notOkError,
  retry,
  abort,
  prom,
} from './lib/request/middlewares.js'
import { makeConfig, makeLoggerConfig } from './lib/config/index.js'
import { makeApi } from './lib/api/index.js'
import { makeJobRunner } from './lib/job/index.js'

import { metrics } from './lib/prom/index.js'

export * from './lib/prom/index.js'

export const loggerConfig = makeLoggerConfig()

export const logger = makeLogger({
  level: loggerConfig.LOGGER_LEVEL,
  pretty: loggerConfig.LOGGER_PRETTY,
})

export const config = makeConfig()

export const request = makeRequest([
  retry(3),
  loggerMiddleware(logger),
  prom(metrics.requestDurationSeconds),
  notOkError(),
  abort(5000),
])

export const api = makeApi(request, logger, config)

export const jobRunner = makeJobRunner(
  'validator-ejector',
  { config, logger, metric: metrics.jobDuration },
  { start: config.BLOCKS_PRELOAD, pooling: config.BLOCKS_LOOP }
)
