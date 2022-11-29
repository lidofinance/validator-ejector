import { printer } from './printer.js'
import type { LoggerOptions, Logger } from './types'

const LOG_LEVELS = ['debug', 'info', 'log', 'warn', 'error']

export const makeLogger = (options?: LoggerOptions) => {
  const {
    level = 'error',
    pretty = true,
    timestamp = true,
  }: LoggerOptions = options || {}
  return LOG_LEVELS.reduce((logger, logLevel) => {
    logger[logLevel] = (message: string, details?: any) => {
      const logLevelOrder = LOG_LEVELS.indexOf(logLevel)
      if (LOG_LEVELS.indexOf(level) < logLevelOrder) return
      const output: {
        message: string
        level: string
        timestamp?: number
        details?: any
      } = {
        message,
        details,
        level: logLevel,
      }

      if (timestamp) output.timestamp = Date.now()
      if (details instanceof Error) {
        output.details = {
          ...details,
          name: details.name,
          message: details.message,
          stack: details.stack,
        }
      }

      const print = pretty ? printer.simple : printer.json

      print(output, logLevel)
    }
    return logger
  }, {}) as Logger
}

export const logger = makeLogger()
