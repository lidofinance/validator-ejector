import { LOG_LEVELS, LoggerService } from '../lib/index.js'

export const mockLogger = () =>
  LOG_LEVELS.reduce((acc, level) => {
    acc[level] = vi.fn()
    return acc
  }, {}) as LoggerService
