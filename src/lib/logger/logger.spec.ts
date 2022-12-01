import { makeLogger, LOG_LEVELS } from './index.js'
import type { LogLevelsUnion } from './types.js'

const mockConsole = () => {
  const log = LOG_LEVELS.reduce<Record<LogLevelsUnion, jest.SpyInstance>>(
    (acc, level) => {
      const method = jest
        .spyOn(console, level as LogLevelsUnion)
        .mockImplementation()
      acc[level] = method
      return acc
    },
    {} as any
  )

  const restore = () => {
    Object.values(log).map((mock) => mock.mockRestore())
  }

  return { restore, log }
}

describe('Logger', () => {
  test('make logger', () => {
    const logger = makeLogger({ pretty: true, level: 'error' })
    expect(logger).toBeDefined()
  })

  describe('print level', () => {
    test('debug enabled: debug logs should be printing', () => {
      const { restore, log } = mockConsole()
      const logger = makeLogger({ pretty: false, level: 'debug' })

      logger.debug('test')

      expect(log.debug).toHaveBeenCalledTimes(1)

      LOG_LEVELS.filter((level) => level !== 'debug').map((level) =>
        expect(log[level]).toHaveBeenCalledTimes(0)
      )

      restore()
    })

    test('debug enabled: debug logs shouldn\'t be printing', () => {
      const { restore, log } = mockConsole()
      const logger = makeLogger({ pretty: false, level: 'info' })

      logger.debug('test')

      expect(log.debug).toHaveBeenCalledTimes(0)

      LOG_LEVELS.filter((level) => level !== 'debug').map((level) =>
        expect(log[level]).toHaveBeenCalledTimes(0)
      )

      restore()
    })

    test('error enabled: all logs except the error must be hidden', () => {
      const { restore, log } = mockConsole()
      const logger = makeLogger({ pretty: false, level: 'error' })

      logger.error('test')

      expect(log.error).toHaveBeenCalledTimes(1)

      LOG_LEVELS.filter((level) => level !== 'error').map((level) => {
        logger[level]('test')
        expect(log[level]).toHaveBeenCalledTimes(0)
      })

      restore()
    })
  })
})
