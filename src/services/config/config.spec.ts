import { LoggerService, LOG_LEVELS } from 'lido-nanolib'
import { makeConfig } from './service.js'
import { jest } from '@jest/globals'

const validConfig = {
  EXECUTION_NODE: 'someurl',
  CONSENSUS_NODE: 'someurl',
  CONTRACT_ADDRESS: '0x596BBA96Fa92e0A3EAf2ca0B157b06193858ba5E',
  OPERATOR_ID: '123',
  BLOCKS_PRELOAD: 10000,
  BLOCKS_LOOP: 100,
  MESSAGES_LOCATION: 'messages',
  HTTP_PORT: 8080,
  RUN_METRICS: true,
  RUN_HEALTH_CHECK: true,
  DRY_RUN: true,
  JOB_INTERVAL: 10000,
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

  test('valid config', () => {
    const makeConf = () =>
      makeConfig({ logger, env: validConfig as unknown as NodeJS.ProcessEnv })

    expect(makeConf).toBeDefined()
  })
})
