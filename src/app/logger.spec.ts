import { makeAppLogger, makeStartupLogger } from './logger.js'

describe('startup logger', () => {
  const mockStdout = () =>
    vi.spyOn(console, 'log').mockImplementation(() => undefined)

  test('prints a start error as JSON on stdout without the secret', () => {
    const log = mockStdout()
    const url = 'https://el.example/generated-el-key'

    try {
      const logger = makeStartupLogger({
        EXECUTION_NODE: url,
      } as NodeJS.ProcessEnv)
      logger.error('Startup error', new Error(`request to ${url}/ failed`))

      expect(log).toHaveBeenCalledTimes(1)
      const line = String(log.mock.calls[0][0])
      expect(JSON.parse(line)).toHaveProperty('level', 'error')
      expect(line).not.toContain('generated-el-key')
    } finally {
      log.mockRestore()
    }
  })

  test('keeps the values of an invalid LOGGER_SECRETS out of the start error', () => {
    const log = mockStdout()
    const env = {
      // A literal value, as the README allows, with a JSON typo
      LOGGER_SECRETS: '["generated-literal-secret"',
      EXECUTION_NODE: 'https://el.example/generated-el-key',
    } as NodeJS.ProcessEnv

    try {
      const logger = makeStartupLogger(env)
      // The same error that makeAppModule throws at start
      const startError = (() => {
        try {
          makeAppLogger(env)
        } catch (error) {
          return error
        }
      })()
      logger.error('Startup error', startError)
      // A later start error that carries the EL key goes through the same
      // fallback logger, which must mask it without LOGGER_SECRETS
      logger.error(
        'Startup error',
        new Error('request to https://el.example/generated-el-key/ failed')
      )

      expect(log).toHaveBeenCalledTimes(2)
      const line = String(log.mock.calls[0][0])
      expect(JSON.parse(line).details).toMatchObject({
        message:
          'Please, setup LOGGER_SECRETS. Example: ["EXECUTION_NODE","CONSENSUS_NODE"]',
      })
      expect(line).not.toContain('generated-literal-secret')
      const masked = String(log.mock.calls[1][0])
      expect(masked).toContain('request to ')
      expect(masked).not.toContain('generated-el-key')
    } finally {
      log.mockRestore()
    }
  })

  test('falls back to a JSON logger when the logger config is invalid', () => {
    const log = mockStdout()

    try {
      const logger = makeStartupLogger({
        LOGGER_LEVEL: 'verbose',
      } as NodeJS.ProcessEnv)
      logger.error('Startup error', new Error('Invalid level input'))

      expect(log).toHaveBeenCalledTimes(1)
      expect(JSON.parse(String(log.mock.calls[0][0]))).toHaveProperty(
        'level',
        'error'
      )
    } finally {
      log.mockRestore()
    }
  })
})
