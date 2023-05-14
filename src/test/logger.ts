import { LOG_LEVELS, LoggerService } from 'lido-nanolib'

export const mockLogger = () =>
  LOG_LEVELS.reduce((acc, level) => {
    acc[level] = vi.fn()
    return acc
  }, {}) as LoggerService
