import { printer } from './printer.js'
import type { LoggerOptions, Logger } from './types'

export const LOG_LEVELS = ['error', 'warn', 'log', 'info', 'debug']

export const makeLogger = (options: LoggerOptions) => {
  const { level, pretty }: LoggerOptions = options
  return LOG_LEVELS.reduce((logger, logLevel) => {
    logger[logLevel] = (message: string, details?: any) => {
      const logLevelOrder = LOG_LEVELS.indexOf(logLevel)
      if (LOG_LEVELS.indexOf(level) < logLevelOrder) return
      const output: {
        message: string
        level: string
        timestamp: number
        details?: any
      } = {
        message,
        details,
        level: logLevel,
        timestamp: Math.floor(Date.now() / 1000),
      }

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
