import { formatter } from './formatter.js'
import type { LoggerOptions, Logger } from './types'

const stdout = console.info.bind(console)
const stderr = console.error.bind(console)

const LOG_LEVELS = ['debug', 'info', 'log', 'warn', 'error']

const makePosition = () => {
  const frameLine = new Error().stack?.split('\n')[3].trim()
  const frameMatch = frameLine?.match(/^at (.+) \((.+):(.+):(.+)\)$/)
  if (frameLine && frameMatch) {
    return {
      function: frameMatch[1],
      file: frameMatch[2],
      line: frameMatch[3],
      column: frameMatch[4],
    }
  }
}

const makeTrace = () => {
  return new Error().stack
    ?.split('\n')
    .slice(3)
    .map((v) => v.trim())
}

export const makeLogger = (options?: LoggerOptions) => {
  const {
    level = 'error',
    pretty = true,
    timestamp = true,
    trace = true,
    position = true,
  }: LoggerOptions = options || {}
  return LOG_LEVELS.reduce((logger, logLevel) => {
    logger[logLevel] = (message: string, details?: any) => {
      const logLevelOrder = LOG_LEVELS.indexOf(logLevel)
      console.log(logLevelOrder, LOG_LEVELS.indexOf(level))
      if (LOG_LEVELS.indexOf(level) < logLevelOrder) return
      const output: {
        message: string
        level: string
        timestamp?: number
        position?: ReturnType<typeof makePosition>
        trace?: ReturnType<typeof makeTrace>
        details?: any
      } = {
        message,
        details,
        level: logLevel,
      }

      if (timestamp) output.timestamp = Date.now()
      if (position) output.position = makePosition()
      if (trace) output.trace = makeTrace()

      const stream = logLevelOrder >= 2 ? stdout : stderr
      const format = pretty ? formatter.simple : formatter.json

      stream(format(output))
    }
    return logger
  }, {}) as Logger
}

export const logger = makeLogger()
