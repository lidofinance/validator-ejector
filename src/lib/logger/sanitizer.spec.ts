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

  describe('secrets with characters JSON.stringify escapes', () => {
    // A secret read from a *_FILE keeps its trailing newline. Once details
    // are serialized the newline becomes the two characters `\n`, so the raw
    // secret no longer occurs in the output and must be matched escaped.
    const secrets = ['password\n', 'pa"ss\\word', 'tab\tsecret']

    test.each(secrets)(
      'redacts %j from details in json transport',
      (secret) => {
        const { restore, log } = mockConsole()
        const logger = makeLogger({
          format: 'json',
          level: 'debug',
          sanitizer: { secrets: [secret], replacer: '<*>' },
        })

        logger.info('started', {
          MESSAGES_PASSWORD: secret,
          nested: { secret },
        })

        expect(log.info).toHaveBeenCalledTimes(1)
        const output = String(log.info.mock.calls[0][0])
        expect(output).not.toContain(JSON.stringify(secret).slice(1, -1))
        expect(output).not.toContain(secret.trim())
        expect(JSON.parse(output).details).toEqual({
          MESSAGES_PASSWORD: '<*>',
          nested: { secret: '<*>' },
        })

        restore()
      }
    )

    test.each(secrets)(
      'redacts %j from details in simple transport',
      (secret) => {
        const { restore, log } = mockConsole()
        const logger = makeLogger({
          format: 'simple',
          level: 'debug',
          sanitizer: { secrets: [secret], replacer: '<*>' },
        })

        logger.info('started', { MESSAGES_PASSWORD: secret })

        expect(log.info).toHaveBeenCalledTimes(1)
        const output = String(log.info.mock.calls[0][0])
        expect(output).toContain('<*>')
        expect(output).not.toContain(JSON.stringify(secret).slice(1, -1))
        expect(output).not.toContain(secret.trim())

        restore()
      }
    )

    test('still redacts the raw secret from the message', () => {
      const { restore, log } = mockConsole()
      const logger = makeLogger({
        format: 'simple',
        level: 'debug',
        sanitizer: { secrets: ['password\n'], replacer: '<*>' },
      })

      logger.info('using password\n now')

      expect(String(log.info.mock.calls[0][0])).toContain('using <*> now')

      restore()
    })
  })

  test('ignores empty secrets', () => {
    const { restore, log } = mockConsole()
    const logger = makeLogger({
      format: 'json',
      level: 'debug',
      sanitizer: { secrets: [''], replacer: '<*>' },
    })

    logger.info('hello', { foo: 'bar' })

    expect(JSON.parse(String(log.info.mock.calls[0][0]))).toMatchObject({
      message: 'hello',
      details: { foo: 'bar' },
    })

    restore()
  })
})
