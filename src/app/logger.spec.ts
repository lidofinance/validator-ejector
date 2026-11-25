import { makeStartupLogger } from './logger.js'

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
