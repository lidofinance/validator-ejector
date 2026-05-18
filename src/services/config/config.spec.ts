import { configBase } from '../../test/config.js'
import {
  makeConfig,
  makeLoggerConfig,
  makeValidationConfig,
} from './service.js'
import { mockLogger } from '../../test/logger.js'
import { makeLogger } from '../../lib/index.js'

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

  test('invalid optional bool config includes env var name', () => {
    const config = {
      ...configBase,
      TRUST_MODE: '',
    }

    const makeConf = () =>
      makeConfig({ logger, env: config as unknown as NodeJS.ProcessEnv })

    expect(makeConf).toThrow('Invalid TRUST_MODE value: expected true or false')
  })

  test('defaults validators batch size', () => {
    const config = { ...configBase, MESSAGES_LOCATION: 'messages' }

    const result = makeConfig({
      logger,
      env: config as unknown as NodeJS.ProcessEnv,
    })

    expect(result.VALIDATORS_BATCH_SIZE).toBe(1000)
  })

  test('accepts validators batch size override', () => {
    const config = {
      ...configBase,
      MESSAGES_LOCATION: 'messages',
      VALIDATORS_BATCH_SIZE: '32',
    }

    const result = makeConfig({
      logger,
      env: config as unknown as NodeJS.ProcessEnv,
    })

    expect(result.VALIDATORS_BATCH_SIZE).toBe(32)
  })

  test('normalizes validators batch size to positive integer', () => {
    const cases = [
      ['0', 1000],
      ['-1', 1],
      ['1.5', 1],
    ] as const

    for (const [value, expected] of cases) {
      const result = makeConfig({
        logger,
        env: {
          ...configBase,
          MESSAGES_LOCATION: 'messages',
          VALIDATORS_BATCH_SIZE: value,
        } as unknown as NodeJS.ProcessEnv,
      })

      expect(result.VALIDATORS_BATCH_SIZE).toBe(expected)
    }
  })

  test('validation config includes validators batch size', () => {
    const config = {
      ...configBase,
      MESSAGES_LOCATION: 'messages',
      VALIDATORS_BATCH_SIZE: '8',
    }

    const result = makeValidationConfig({
      env: config as unknown as NodeJS.ProcessEnv,
    })

    expect(result.VALIDATORS_BATCH_SIZE).toBe(8)
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

      const configResult = makeConf()
      expect(configResult.OPERATOR_IDS).toEqual([123])
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

      const configResult = makeConf()
      expect(configResult.OPERATOR_IDS).toEqual([1, 2, 3])
    })

    test('if both values are set, OPERATOR_IDENTIFIERS must be selected', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { OPERATOR_ID, ...configWithoutOperatorId } = configBase
      const config = {
        ...configWithoutOperatorId,
        VALIDATOR_EXIT_WEBHOOK: 'http://webhook',
        OPERATOR_IDENTIFIERS: '[1, 2, 3]',
        OPERATOR_ID: '2222',
      }

      const makeConf = () =>
        makeConfig({ logger, env: config as unknown as NodeJS.ProcessEnv })

      expect(makeConf).not.toThrow()

      const configResult = makeConf()
      expect(configResult.OPERATOR_IDS).toEqual([1, 2, 3])
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

  describe('staking module identification validation', () => {
    test('should not throw when only STAKING_MODULE_ID is provided', () => {
      const config = {
        ...configBase,
        VALIDATOR_EXIT_WEBHOOK: 'http://webhook',
        STAKING_MODULE_ID: '123',
      }

      const makeConf = () =>
        makeConfig({ logger, env: config as unknown as NodeJS.ProcessEnv })

      expect(makeConf).not.toThrow()

      const configResult = makeConf()
      expect(configResult.STAKING_MODULE_IDS).toEqual(['123'])
    })

    test('should throw when STAKING_MODULE_ID is missing in legacy mode', () => {
      const config = {
        ...configBase,
        VALIDATOR_EXIT_WEBHOOK: 'http://webhook',
        STAKING_MODULE_ID: undefined,
      }

      const makeConf = () =>
        makeConfig({ logger, env: config as unknown as NodeJS.ProcessEnv })

      expect(makeConf).toThrow(/EJECTOR_SCOPE or STAKING_MODULE_ID/)
    })
  })

  describe('ejector scope normalization', () => {
    const makeConf = (config: Record<string, unknown>) =>
      makeConfig({ logger, env: config as unknown as NodeJS.ProcessEnv })

    test('normalizes EJECTOR_SCOPE and derives compatibility ids', () => {
      const config = {
        ...configBase,
        VALIDATOR_EXIT_WEBHOOK: 'http://webhook',
        EJECTOR_SCOPE: '{"1":[0,1],"4":[2]}',
      }

      const result = makeConf(config)

      expect(result.EJECTOR_SCOPE).toEqual([
        { stakingModuleId: '1', operatorIds: [0, 1] },
        { stakingModuleId: '4', operatorIds: [2] },
      ])
      expect(result.STAKING_MODULE_IDS).toEqual(['1', '4'])
      expect(result.OPERATOR_IDS).toEqual([0, 1, 2])
    })

    test('EJECTOR_SCOPE wins over legacy module and operator vars', () => {
      const config = {
        ...configBase,
        VALIDATOR_EXIT_WEBHOOK: 'http://webhook',
        STAKING_MODULE_ID: '99',
        OPERATOR_ID: '99',
        OPERATOR_IDENTIFIERS: '[98, 99]',
        EJECTOR_SCOPE: '{"1":[0],"4":[2]}',
      }

      const result = makeConf(config)

      expect(result.EJECTOR_SCOPE).toEqual([
        { stakingModuleId: '1', operatorIds: [0] },
        { stakingModuleId: '4', operatorIds: [2] },
      ])
      expect(result.STAKING_MODULE_IDS).toEqual(['1', '4'])
      expect(result.OPERATOR_IDS).toEqual([0, 2])
    })

    test('EJECTOR_SCOPE ignores invalid legacy module and operator vars', () => {
      const config = {
        ...configBase,
        VALIDATOR_EXIT_WEBHOOK: 'http://webhook',
        STAKING_MODULE_ID: 'bad',
        OPERATOR_ID: 'bad',
        OPERATOR_IDENTIFIERS: 'not-json',
        EJECTOR_SCOPE: '{"1":[0],"4":[2]}',
      }

      const result = makeConf(config)

      expect(result.EJECTOR_SCOPE).toEqual([
        { stakingModuleId: '1', operatorIds: [0] },
        { stakingModuleId: '4', operatorIds: [2] },
      ])
      expect(result.STAKING_MODULE_IDS).toEqual(['1', '4'])
      expect(result.OPERATOR_IDS).toEqual([0, 2])
    })

    test('rejects invalid EJECTOR_SCOPE values', () => {
      const cases = [
        ['{}', /at least one staking module/],
        ['{"1":[]}', /at least one operator id/],
        ['{"abc":[1]}', /staking module id must be a non-negative integer/],
        ['{"-1":[1]}', /staking module id must be a non-negative integer/],
        ['{"1.5":[1]}', /staking module id must be a non-negative integer/],
        ['{"1":["bad"]}', /operators for staking module 1/],
        ['{"1":[-1]}', /operators for staking module 1/],
        ['{"1":[1.5]}', /operators for staking module 1/],
      ] as const

      for (const [scope, error] of cases) {
        expect(() =>
          makeConf({
            ...configBase,
            VALIDATOR_EXIT_WEBHOOK: 'http://webhook',
            EJECTOR_SCOPE: scope,
          })
        ).toThrow(error)
      }
    })

    test('throws when legacy module or operator config is missing', () => {
      const withoutStakingModule = { ...configBase }
      delete (withoutStakingModule as Partial<typeof configBase>)
        .STAKING_MODULE_ID

      const withoutOperator = {
        ...configBase,
      } as typeof configBase & { OPERATOR_IDENTIFIERS?: string }
      delete (withoutOperator as Partial<typeof withoutOperator>).OPERATOR_ID
      delete (withoutOperator as Partial<typeof withoutOperator>)
        .OPERATOR_IDENTIFIERS

      expect(() =>
        makeConf({
          ...withoutStakingModule,
          VALIDATOR_EXIT_WEBHOOK: 'http://webhook',
        })
      ).toThrow(/EJECTOR_SCOPE or STAKING_MODULE_ID/)

      expect(() =>
        makeConf({
          ...withoutOperator,
          VALIDATOR_EXIT_WEBHOOK: 'http://webhook',
        })
      ).toThrow(/EJECTOR_SCOPE, OPERATOR_ID or OPERATOR_IDENTIFIERS/)
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

  test('invalid logger secrets config', () => {
    const env = {
      LOGGER_LEVEL: 'info',
      LOGGER_FORMAT: 'simple',
      LOGGER_SECRETS: `["secret"`,
    } as NodeJS.ProcessEnv

    const makeConf = () => makeLoggerConfig({ env })

    expect(makeConf).toThrowError(
      'Please, setup LOGGER_SECRETS. Example: ["EXECUTION_NODE","CONSENSUS_NODE"]'
    )
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

  test('dynamic multi-url secrets include individual normalized endpoints', () => {
    const env = {
      LOGGER_LEVEL: 'info',
      LOGGER_FORMAT: 'simple',
      LOGGER_SECRETS: `["EXECUTION_NODE","CONSENSUS_NODE"]`,
      EXECUTION_NODE:
        'https://el-a.example/secret-el-token-a/, https://el-b.example/secret-el-token-b//',
      CONSENSUS_NODE:
        'https://cl-a.example/secret-cl-token-a,http://cl-b.example/secret-cl-token-b/',
    } as NodeJS.ProcessEnv

    const makeConf = () => makeLoggerConfig({ env })

    expect(makeConf).not.toThrow()

    const config = makeConf()

    expect(config.LOGGER_SECRETS).toEqual([
      env.EXECUTION_NODE,
      'https://el-a.example/secret-el-token-a',
      'https://el-b.example/secret-el-token-b',
      env.CONSENSUS_NODE,
      'https://cl-a.example/secret-cl-token-a',
      'http://cl-b.example/secret-cl-token-b',
    ])
  })

  test('dynamic multi-url secrets redact normalized config arrays in json logs', () => {
    const env = {
      ...configBase,
      MESSAGES_LOCATION: 'messages',
      LOGGER_LEVEL: 'info',
      LOGGER_FORMAT: 'json',
      LOGGER_SECRETS: `["EXECUTION_NODE","CONSENSUS_NODE"]`,
      EXECUTION_NODE:
        'https://el-a.example/secret-el-token-a/, https://el-b.example/secret-el-token-b//',
      CONSENSUS_NODE:
        'https://cl-a.example/secret-cl-token-a,http://cl-b.example/secret-cl-token-b/',
    } as unknown as NodeJS.ProcessEnv

    const loggerConfig = makeLoggerConfig({ env })
    const logger = makeLogger({
      level: loggerConfig.LOGGER_LEVEL,
      format: loggerConfig.LOGGER_FORMAT,
      sanitizer: {
        secrets: loggerConfig.LOGGER_SECRETS,
        replacer: '<secret>',
      },
    })
    const appConfig = makeConfig({ logger, env })
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    try {
      logger.info('startup', { ...appConfig })

      const output = String(info.mock.calls[0][0])
      expect(output).toContain('<secret>')
      expect(output).not.toContain('https://el-a.example/secret-el-token-a')
      expect(output).not.toContain('https://el-b.example/secret-el-token-b')
      expect(output).not.toContain('https://cl-a.example/secret-cl-token-a')
      expect(output).not.toContain('http://cl-b.example/secret-cl-token-b')
      expect(output).not.toContain('secret-el-token-a')
      expect(output).not.toContain('secret-el-token-b')
      expect(output).not.toContain('secret-cl-token-a')
      expect(output).not.toContain('secret-cl-token-b')
    } finally {
      info.mockRestore()
    }
  })
})
