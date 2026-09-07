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

  test.each(['json', 'simple'] as const)(
    'sanitize message and details in %s transport with escaped strings',
    (format) => {
      const { restore, log } = mockConsole()
      const escapedValue = 'secret""///\\\t\n'
      const details = {
        value: escapedValue,
        nested: { values: [escapedValue, 42, null] },
      }
      const logger = makeLogger({
        format,
        level: 'debug',
        sanitizer: {
          secrets: [escapedValue],
          replacer: '<*>',
        },
      })

      try {
        logger.debug(`test ${escapedValue}`, details)

        expect(log.debug).toHaveBeenCalledTimes(1)
        const line = log.debug.mock.calls[0][0]
        const sanitizedDetails = {
          value: '<*>',
          nested: { values: ['<*>', 42, null] },
        }
        if (format === 'json') {
          expect(JSON.parse(line)).toMatchObject({
            message: 'test <*>',
            details: sanitizedDetails,
          })
        } else {
          expect(line).toContain('test <*>')
          expect(line).toContain(JSON.stringify(sanitizedDetails))
        }
        expect(line).not.toContain('secret')
        expect(details.value).toBe(escapedValue)
        expect(details.nested.values).toEqual([escapedValue, 42, null])
      } finally {
        restore()
      }
    }
  )
})
