import dotenv from 'dotenv'
import {
  makeLogger,
  makeRequest,
  retry,
  abort,
  notOkError,
  prom,
  logger as loggerMiddleware,
} from '../lib/index.js'
import { makeLoggerConfig, makeConfig } from '../services/config/service.js'
import { makeExecutionApi } from '../services/execution-api/service.js'
import { makeExitLogsService } from '../services/exit-logs/service.js'
import { makeMetrics } from '../services/prom/service.js'

dotenv.config()

const run = async () => {
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

  const operatorIds = config.OPERATOR_IDENTIFIERS
    ? [...(config.OPERATOR_IDENTIFIERS ?? [])]
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      [config.OPERATOR_ID!]

  const metrics = makeMetrics({ PREFIX: config.PROM_PREFIX })

  const executionHttp = makeRequest([
    retry(3),
    loggerMiddleware(logger),
    prom(metrics.executionRequestDurationSeconds),
    notOkError(),
    abort(30_000),
  ])

  const executionApi = makeExecutionApi(executionHttp, logger, config)

  const exitLogs = makeExitLogsService(logger, executionApi, config, metrics)

  await executionApi.resolveExitBusAddress()
  await executionApi.resolveConsensusAddress()
  const fetchTimeStart = performance.now()
  const lastBlockNumber = await executionApi.latestBlockNumber()

  const logs = await exitLogs.getLogs(operatorIds, lastBlockNumber)

  logger.info('logs fetched', { count: logs.length })

  const fetchTimeEnd = performance.now()
  const fetchTime = Math.ceil(fetchTimeEnd - fetchTimeStart) / 1000

  logger.info(`Logs fetched in ${fetchTime} seconds`)
}

run().catch(console.error)
