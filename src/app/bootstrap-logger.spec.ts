import { makeBootstrapLogger } from './bootstrap-logger.js'

const mockConsoleError = () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const output = () => spy.mock.calls.map((call) => call.join(' ')).join('\n')
  return { spy, output, restore: () => spy.mockRestore() }
}

describe('makeBootstrapLogger', () => {
  test('redacts a secret resolved from an env variable name', () => {
    const { output, restore } = mockConsoleError()
    const env = {
      LOGGER_SECRETS: '["MY_SECRET"]',
      MY_SECRET: 'super-secret-value',
    } as NodeJS.ProcessEnv

    const logger = makeBootstrapLogger(env)
    logger.error(
      'Startup error',
      new Error('request to https://node.example/super-secret-value failed')
    )

    expect(output()).not.toContain('super-secret-value')
    expect(output()).toContain('<secret>')
    restore()
  })

  test('redacts secrets inside nested causes and aggregate errors', () => {
    const { output, restore } = mockConsoleError()
    const env = {
      LOGGER_SECRETS: '["RPC_URL"]',
      RPC_URL: 'https://rpc.example/api-key-123',
    } as NodeJS.ProcessEnv

    const logger = makeBootstrapLogger(env)
    const cause = new AggregateError(
      [new Error('connect failed: https://rpc.example/api-key-123')],
      'all endpoints failed'
    )
    logger.error('Startup error', new Error('sync check failed', { cause }))

    expect(output()).not.toContain('api-key-123')
    expect(output()).toContain('<secret>')
    restore()
  })

  test('redacts a literal secret with no matching env variable', () => {
    const { output, restore } = mockConsoleError()
    const env = {
      LOGGER_SECRETS: '["literal-password"]',
    } as NodeJS.ProcessEnv

    const logger = makeBootstrapLogger(env)
    logger.error('Startup error', new Error('auth failed: literal-password'))

    expect(output()).not.toContain('literal-password')
    expect(output()).toContain('<secret>')
    restore()
  })

  test('respects the configured logger format', () => {
    const { spy, restore } = mockConsoleError()
    const env = {
      LOGGER_FORMAT: 'json',
      LOGGER_SECRETS: '["TOKEN"]',
      TOKEN: 'token-value',
    } as NodeJS.ProcessEnv

    const logger = makeBootstrapLogger(env)
    logger.error('Startup error', { url: 'https://x/token-value' })

    const parsed = JSON.parse(spy.mock.calls[0][0])
    expect(parsed.message).toBe('Startup error')
    expect(parsed.details.url).toBe('https://x/<secret>')
    restore()
  })

  test('throws when logger config cannot be resolved instead of running unsanitized', () => {
    const env = {
      LOGGER_SECRETS: '["FOO"]',
      FOO_FILE: '/nonexistent/secret/file',
    } as NodeJS.ProcessEnv

    expect(() => makeBootstrapLogger(env)).toThrow('Unable to load FOO_FILE')
  })
})
