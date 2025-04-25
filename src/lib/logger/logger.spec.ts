import { makeLogger, LOG_LEVELS } from './index.js'
import { dateFormat } from './printer.js'
import type { LogLevelsUnion } from './types.js'

const mockConsole = () => {
  const log = LOG_LEVELS.reduce<Record<LogLevelsUnion, any>>((acc, level) => {
    const method = vi
      .spyOn(console, level as LogLevelsUnion)
      .mockImplementation(() => ({ log: () => vi.fn }))
    acc[level] = method
    return acc
  }, {} as any)

  const restore = () => {
    Object.values(log).map((mock) => mock.mockRestore())
  }

  return { restore, log }
}

describe('Logger', () => {
  test('make logger', () => {
    const logger = makeLogger({ format: 'json', level: 'error' })
    expect(logger).toBeDefined()
  })

  test('date format', () => {
    const testingDate = Number(new Date('2022-01-01T13:58:22.854Z')) / 1000
    const dateStr = dateFormat(testingDate)

    expect(dateStr).toMatchInlineSnapshot(`"2022-01-01 13:58:22"`)
  })

  test('json output', () => {
    const { restore, log } = mockConsole()
    const logger = makeLogger({ format: 'json', level: 'info' })
    const testMessage = 'test message'
    const testData = { foo: 'bar', num: 42 }

    logger.info(testMessage, testData)

    expect(log.info).toHaveBeenCalledTimes(1)
    const loggedJson = JSON.parse(log.info.mock.calls[0][0])

    expect(loggedJson).toHaveProperty('timestamp')
    expect(loggedJson).toHaveProperty('level', 'info')
    expect(loggedJson).toHaveProperty('message', testMessage)
    expect(loggedJson).toHaveProperty('details')
    expect(loggedJson.details).toEqual(testData)

    restore()
  })

  test('test simple output', () => {
    const { restore, log } = mockConsole()
    const logger = makeLogger({ format: 'simple', level: 'warn' })
    const testMessage = 'warning message'

    logger.warn(testMessage)

    expect(log.warn).toHaveBeenCalledTimes(1)
    const loggedString = log.warn.mock.calls[0][0]

    expect(typeof loggedString).toBe('string')
    expect(loggedString).toContain(testMessage)
    expect(loggedString).toContain('warn')
    // Check for timestamp-like content (numbers and colons)
    expect(loggedString).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)

    restore()
  })

  describe('print level', () => {
    test('debug enabled: debug logs should be printing', () => {
      const { restore, log } = mockConsole()
      const logger = makeLogger({ format: 'json', level: 'debug' })

      logger.debug('test')

      expect(log.debug).toHaveBeenCalledTimes(1)

      LOG_LEVELS.filter((level) => level !== 'debug').map((level) =>
        expect(log[level]).toHaveBeenCalledTimes(0)
      )

      restore()
    })

    test("debug enabled: debug logs shouldn't be printing", () => {
      const { restore, log } = mockConsole()
      const logger = makeLogger({ format: 'json', level: 'info' })

      logger.debug('test')

      expect(log.debug).toHaveBeenCalledTimes(0)

      LOG_LEVELS.filter((level) => level !== 'debug').map((level) =>
        expect(log[level]).toHaveBeenCalledTimes(0)
      )

      restore()
    })

    test('error enabled: all logs except the error must be hidden', () => {
      const { restore, log } = mockConsole()
      const logger = makeLogger({ format: 'json', level: 'error' })

      logger.error('test')

      expect(log.error).toHaveBeenCalledTimes(1)

      LOG_LEVELS.filter((level) => level !== 'error').map((level) => {
        logger[level]('test')
        expect(log[level]).toHaveBeenCalledTimes(0)
      })

      restore()
    })
  })
  describe('error handling with cause', () => {
    test('error with cause should be properly serialized in log', () => {
      const { restore, log } = mockConsole()
      const logger = makeLogger({ format: 'json', level: 'error' })

      const level2Error = new Error('Level 2 error')
      const level1Error = new Error('Level 1 error')
      ;(level1Error as any).cause = level2Error

      logger.error('Test error with cause', level1Error)

      expect(log.error).toHaveBeenCalledTimes(1)
      const loggedError = JSON.parse(log.error.mock.calls[0][0])

      expect(loggedError.message).toBe('Test error with cause')
      expect(loggedError.details.message).toBe('Level 1 error')
      expect(loggedError.details.cause.message).toBe('Level 2 error')

      restore()
    })

    test('error with deeply nested cause should be limited by depth', () => {
      const { restore, log } = mockConsole()
      const logger = makeLogger({
        format: 'json',
        level: 'error',
        causeDepth: 2,
      })

      const level3Error = new Error('Level 3 error')
      const level2Error = new Error('Level 2 error')
      ;(level2Error as Error).cause = level3Error
      const level1Error = new Error('Level 1 error')
      ;(level1Error as Error).cause = level2Error

      logger.error('Test error with deeply nested cause', level1Error)

      expect(log.error).toHaveBeenCalledTimes(1)
      const loggedError = JSON.parse(log.error.mock.calls[0][0])

      expect(loggedError.message).toBe('Test error with deeply nested cause')
      expect(loggedError.details.message).toBe('Level 1 error')
      expect(loggedError.details.cause.message).toBe('Level 2 error')
      expect(loggedError.details.cause.cause).toEqual({
        message: 'Max depth reached',
      })

      restore()
    })
  })
})
