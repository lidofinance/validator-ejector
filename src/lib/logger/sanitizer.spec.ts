import { makeLogger, LOG_LEVELS } from './index.js'
import { sanitize, stringify } from './sanitizer.js'

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

  test.each([
    'fixture\n',
    '  fixture  ',
    '"fixture',
    'fixture\\',
    'fix\tture',
    'fix.*[ture](value)$',
  ])('sanitizes keys and serialized values containing %j', (escapedValue) => {
    const details = {
      [escapedValue]: {
        raw: escapedValue,
        trimmed: escapedValue.trim(),
        encoded: JSON.stringify({ value: escapedValue }),
        doubleEncoded: JSON.stringify(JSON.stringify({ value: escapedValue })),
      },
      count: 42,
    }
    const encoded = JSON.stringify({ value: '<*>' })

    expect(
      JSON.parse(
        stringify(details, { secrets: [escapedValue], replacer: '<*>' })
      )
    ).toEqual({
      '<*>': {
        raw: '<*>',
        trimmed: '<*>',
        encoded,
        doubleEncoded: JSON.stringify(encoded),
      },
      count: 42,
    })
    expect(details[escapedValue]).toMatchObject({ raw: escapedValue })
  })

  test('ignores empty secrets and preserves JSON escape boundaries', () => {
    const details = { value: '\nabc', count: 42 }
    expect(
      JSON.parse(stringify(details, { secrets: ['', 'nabc'], replacer: '<*>' }))
    ).toEqual(details)
  })

  test('replaces overlapping secrets once and treats the replacement literally', () => {
    expect(
      sanitize('fixture-long fixture', {
        secrets: ['fixture', 'fixture-long'],
        replacer: '$&',
      })
    ).toBe('$& $&')
  })

  test.each(['json', 'simple'] as const)(
    'sanitizes request headers only for the current record in %s transport',
    (format) => {
      const { restore, log } = mockConsole()
      const runtimeValue = 'generated-fixture'
      const headers = {
        Authorization: runtimeValue,
        'X-Custom': 'custom-fixture',
      }
      const sanitizer = { secrets: [] as string[], replacer: '<*>' }
      const logger = makeLogger({ format, level: 'debug', sanitizer })

      try {
        logger.debug(`request ${runtimeValue}`, { headers })
        const line = String(log.debug.mock.calls[0][0])
        expect(line).not.toContain(runtimeValue)
        expect(line).not.toContain(headers['X-Custom'])
        const details = { headers: { Authorization: '<*>', 'X-Custom': '<*>' } }
        if (format === 'json') {
          expect(JSON.parse(line)).toMatchObject({
            message: 'request <*>',
            details,
          })
        } else {
          expect(line).toContain(JSON.stringify(details))
        }
        expect(headers.Authorization).toBe(runtimeValue)
        expect(sanitizer.secrets).toEqual([])

        logger.debug('next record', { value: runtimeValue })
        expect(String(log.debug.mock.calls[1][0])).toContain(runtimeValue)
      } finally {
        restore()
      }
    }
  )
})
