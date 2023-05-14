import { configBase } from '../../test/config.js'
import { makeConfig, makeLoggerConfig } from './service.js'
import { mockLogger } from '../../test/logger.js'

let logger = mockLogger()

describe('config module', () => {
  beforeEach(() => {
    logger = mockLogger()
  })

  test('invalid config', () => {
    const env = {} as NodeJS.ProcessEnv

    const makeConf = () => makeConfig({ logger, env })

    expect(makeConf).toThrow()
  })

  test('config with messages', () => {
    const config = { ...configBase, MESSAGES_LOCATION: 'messages' }

    const makeConf = () =>
      makeConfig({ logger, env: config as unknown as NodeJS.ProcessEnv })

    expect(makeConf).not.toThrow()
  })

  test('config with webhook', () => {
    const config = { ...configBase, VALIDATOR_EXIT_WEBHOOK: 'http://webhook' }

    const makeConf = () =>
      makeConfig({ logger, env: config as unknown as NodeJS.ProcessEnv })

    expect(makeConf).not.toThrow()
  })
})

describe('logger config module', () => {
  test('exact secret values', () => {
    const env = {
      LOGGER_LEVEL: 'info',
      LOGGER_FORMAT: 'simple',
      LOGGER_SECRETS: `["secret"]`,
    } as NodeJS.ProcessEnv

    const makeConf = () => makeLoggerConfig({ env })

    expect(makeConf).not.toThrow()

    const config = makeConf()

    expect(config.LOGGER_SECRETS).toEqual(['secret'])
  })

  test('dynamic secret values', () => {
    const env = {
      LOGGER_LEVEL: 'info',
      LOGGER_FORMAT: 'simple',
      LOGGER_SECRETS: `["LOGGER_FORMAT"]`,
    } as NodeJS.ProcessEnv

    const makeConf = () => makeLoggerConfig({ env })

    expect(makeConf).not.toThrow()

    const config = makeConf()

    expect(config.LOGGER_SECRETS).toEqual(['simple'])
  })

  test('exact and dynamic secret values', () => {
    const env = {
      LOGGER_LEVEL: 'info',
      LOGGER_FORMAT: 'simple',
      LOGGER_SECRETS: `["LOGGER_FORMAT","secret"]`,
    } as NodeJS.ProcessEnv

    const makeConf = () => makeLoggerConfig({ env })

    expect(makeConf).not.toThrow()

    const config = makeConf()

    expect(config.LOGGER_SECRETS).toEqual(['simple', 'secret'])
  })
})
