import { LoggerService, LOG_LEVELS } from 'lido-nanolib'
import { makeConfig, makeLoggerConfig } from './service.js'
import { jest } from '@jest/globals'

const configBase = {
  EXECUTION_NODE: 'someurl',
  CONSENSUS_NODE: 'someurl',
  LOCATOR_ADDRESS: '0x12cd349E19Ab2ADBE478Fc538A66C059Cf40CFeC',
  STAKING_MODULE_ID: '123',
  OPERATOR_ID: '123',
  BLOCKS_PRELOAD: 10000,
  ORACLE_ADDRESSES_ALLOWLIST: '["0x123","0x12345"]',
  HTTP_PORT: 8080,
  RUN_METRICS: true,
  RUN_HEALTH_CHECK: true,
  DRY_RUN: true,
  LOGGER_LEVEL: 'debug',
  LOGGER_PRETTY: true,
}

const testingLogger = () =>
  LOG_LEVELS.reduce((acc, level) => {
    acc[level] = jest.fn()
    return acc
  }, {}) as LoggerService

let logger = testingLogger()

describe('config module', () => {
  beforeEach(() => {
    logger = testingLogger()
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
})
