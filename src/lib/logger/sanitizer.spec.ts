import { makeLogger } from './index.js'
import { sanitize, stringify } from './sanitizer.js'

const mask = (value: string) => '*'.repeat(value.length)

// Every record goes to stdout through console.log
const mockConsole = () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  return { restore: () => log.mockRestore(), log }
}

describe('Logger Sanitizer', () => {
  test('sanitize message in json transport', () => {
    const { restore, log } = mockConsole()
    const logger = makeLogger({
      format: 'json',
      level: 'debug',
      sanitizer: {
        secrets: ['secret'],
      },
    })

    logger.debug('test secret')

    expect(log).toHaveBeenCalledTimes(1)
    expect(JSON.parse(log.mock.lastCall as unknown as string).message).toBe(
      'test ******'
    )

    restore()
  })

  test('sanitize message in simple transport', () => {
    const { restore, log } = mockConsole()
    const logger = makeLogger({
      format: 'simple',
      level: 'debug',
      sanitizer: {
        secrets: ['secret'],
      },
    })

    logger.debug('test secret')

    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0].includes('test ******')).toBe(true)

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
        },
      })

      try {
        logger.debug(`test ${escapedValue}`, details)

        expect(log).toHaveBeenCalledTimes(1)
        const line = log.mock.calls[0][0]
        const sanitizedDetails = {
          value: mask(escapedValue),
          nested: { values: [mask(escapedValue), 42, null] },
        }
        if (format === 'json') {
          expect(JSON.parse(line)).toMatchObject({
            message: `test ${mask(escapedValue)}`,
            details: sanitizedDetails,
          })
        } else {
          expect(line).toContain(`test ${mask(escapedValue)}`)
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
    const stars = /^\*+$/

    const { count, ...rest } = JSON.parse(
      stringify(details, { secrets: [escapedValue] })
    )
    const [[key, value]] = Object.entries<any>(rest)

    expect(count).toBe(42)
    expect(key).toBe(mask(escapedValue))
    expect(value.raw).toBe(mask(escapedValue))
    expect(value.trimmed).toBe(mask(escapedValue.trim()))
    expect(JSON.parse(value.encoded).value).toMatch(stars)
    expect(JSON.parse(JSON.parse(value.doubleEncoded)).value).toMatch(stars)
    expect(details[escapedValue]).toMatchObject({ raw: escapedValue })
  })

  test('ignores empty secrets and preserves JSON escape boundaries', () => {
    const details = { value: '\nabc', count: 42 }
    expect(JSON.parse(stringify(details, { secrets: ['', 'nabc'] }))).toEqual(
      details
    )
  })

  test('redacts instead of throwing or leaking when a secret is too large to compile', () => {
    // A secret this large overflows the regex compiler; the sanitizer must not
    // throw (it runs unguarded in the simple printer) and must not fall back to
    // the raw input, which still holds the secret
    const oversizedValue = 'a'.repeat(2_000_000)
    const output = sanitize(`value ${oversizedValue} end`, {
      secrets: [oversizedValue],
    })

    expect(output).not.toContain(oversizedValue)
    expect(output).toContain('unsanitizable')
    // reports sizes so the offending secret can be traced, never its contents
    expect(output).toContain(String(oversizedValue.length))
  })

  test('masks overlapping secrets once', () => {
    expect(
      sanitize('fixture-long fixture', {
        secrets: ['fixture', 'fixture-long'],
      })
    ).toBe(`${mask('fixture-long')} ${mask('fixture')}`)
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
      const sanitizer = { secrets: [] as string[] }
      const logger = makeLogger({ format, level: 'debug', sanitizer })

      try {
        logger.debug(`request ${runtimeValue}`, { headers })
        const line = String(log.mock.calls[0][0])
        expect(line).not.toContain(runtimeValue)
        expect(line).not.toContain(headers['X-Custom'])
        const details = {
          headers: {
            Authorization: mask(runtimeValue),
            'X-Custom': mask(headers['X-Custom']),
          },
        }
        if (format === 'json') {
          expect(JSON.parse(line)).toMatchObject({
            message: `request ${mask(runtimeValue)}`,
            details,
          })
        } else {
          expect(line).toContain(JSON.stringify(details))
        }
        expect(headers.Authorization).toBe(runtimeValue)
        expect(sanitizer.secrets).toEqual([])

        logger.debug('next record', { value: runtimeValue })
        expect(String(log.mock.calls[1][0])).toContain(runtimeValue)
      } finally {
        restore()
      }
    }
  )
})
