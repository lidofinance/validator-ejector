import { makeLogger } from './lib/logger/index.js'
import { makeRequest } from './lib/request/index.js'
import {
  logger as loggerMiddleware,
  notOkError,
  retry,
  abort,
} from './lib/request/middlewares.js'
import { makeConfig } from './lib/config/index.js'

export * from './lib/prom/index.js'

export const logger = makeLogger()

export const config = makeConfig()

export const request = makeRequest([
  retry(3),
  loggerMiddleware(logger),
  notOkError(),
  abort(5000),
])
