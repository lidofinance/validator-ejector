import { printer } from './printer.js'
import { serializeErrorWithCause } from './serialize-error.js'
import type { LoggerOptions, Logger } from './types'

export const LOG_LEVELS = ['error', 'warn', 'log', 'info', 'debug']

export type LoggerService = ReturnType<typeof makeLogger>

export const makeLogger = (options: LoggerOptions) => {
  const {
    level,
    format,
    silent,
    causeDepth = 3,
    sanitizer = { secrets: [], replacer: '*' },
  }: LoggerOptions = options
  return LOG_LEVELS.reduce((logger, logLevel) => {
    logger[logLevel] = (message: string, details?: any) => {
      const logLevelOrder = LOG_LEVELS.indexOf(logLevel)
      if (LOG_LEVELS.indexOf(level) < logLevelOrder) return
      const output: {
        message: string
        level: string
        timestamp: number

        details?: unknown
      } = {
        message,
        details,
        level: logLevel,
        timestamp: Math.floor(Date.now() / 1000),
      }

      if (details instanceof Error) {
        output.details = {
          ...details,
          ...serializeErrorWithCause(details, causeDepth),
        }
      }

      const print = format === 'simple' ? printer.simple : printer.json

      if (!silent) print(output, logLevel, sanitizer)
    }
    return logger
  }, {}) as Logger
}
