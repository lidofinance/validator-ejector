import { makeLogger, LOG_LEVELS } from './index.js'

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

describe('Logger Sanitizer', () => {
  test('sanitize message in json transport', () => {
    const { restore, log } = mockConsole()
    const logger = makeLogger({
      format: 'json',
      level: 'debug',
      sanitizer: {
        secrets: ['secret'],
        replacer: '<*>',
      },
    })

    logger.debug('test secret')

    expect(log.debug).toHaveBeenCalledTimes(1)
    expect(
      JSON.parse(log.debug.mock.lastCall as unknown as string).message
    ).toBe('test <*>')

    restore()
  })

  test('sanitize message in simple transport', () => {
    const { restore, log } = mockConsole()
    const logger = makeLogger({
      format: 'simple',
      level: 'debug',
      sanitizer: {
        secrets: ['secret'],
        replacer: '<*>',
      },
    })

    logger.debug('test secret')

    expect(log.debug).toHaveBeenCalledTimes(1)
    expect(log.debug.mock.calls[0][0].includes('test <*>')).toBe(true)

    restore()
  })

  test('sanitize message in simple transport with escaped strings', () => {
    const { restore, log } = mockConsole()
    const logger = makeLogger({
      format: 'simple',
      level: 'debug',
      sanitizer: {
        secrets: ['secret""///\\'],
        replacer: '<*>',
      },
    })

    logger.debug('test secret""///\\')

    expect(log.debug).toHaveBeenCalledTimes(1)
    expect(log.debug.mock.calls[0][0].includes('test <*>')).toBe(true)

    restore()
  })
})
