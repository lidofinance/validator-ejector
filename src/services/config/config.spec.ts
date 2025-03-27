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

  describe('operator identification validation', () => {
    test('should throw when neither OPERATOR_ID nor OPERATOR_IDENTIFIERS are provided', () => {
      // Remove operator IDs from the base config
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { OPERATOR_ID, ...configWithoutOperatorId } = configBase

      const makeConf = () =>
        makeConfig({
          logger,
          env: configWithoutOperatorId as unknown as NodeJS.ProcessEnv,
        })

      expect(makeConf).toThrow(
        'Neither MESSAGES_LOCATION nor VALIDATOR_EXIT_WEBHOOK are defined. Please set one of them.'
      )
    })

    test('should not throw when only OPERATOR_ID is provided', () => {
      const config = {
        ...configBase,
        VALIDATOR_EXIT_WEBHOOK: 'http://webhook',
        OPERATOR_ID: '123',
        OPERATOR_IDENTIFIERS: undefined,
      }

      const makeConf = () =>
        makeConfig({ logger, env: config as unknown as NodeJS.ProcessEnv })

      expect(makeConf).not.toThrow()
    })

    test('should not throw when only OPERATOR_IDENTIFIERS with values is provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { OPERATOR_ID, ...configWithoutOperatorId } = configBase
      const config = {
        ...configWithoutOperatorId,
        VALIDATOR_EXIT_WEBHOOK: 'http://webhook',
        OPERATOR_IDENTIFIERS: '[1, 2, 3]',
      }

      const makeConf = () =>
        makeConfig({ logger, env: config as unknown as NodeJS.ProcessEnv })

      expect(makeConf).not.toThrow()
    })

    test('should throw when OPERATOR_IDENTIFIERS is empty array', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { OPERATOR_ID, ...configWithoutOperatorId } = configBase
      const config = {
        ...configWithoutOperatorId,
        OPERATOR_IDENTIFIERS: '[]',
      }

      const makeConf = () =>
        makeConfig({ logger, env: config as unknown as NodeJS.ProcessEnv })

      expect(makeConf).toThrow(
        'Neither MESSAGES_LOCATION nor VALIDATOR_EXIT_WEBHOOK are defined. Please set one of them.'
      )
    })
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
