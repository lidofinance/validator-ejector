import { makeLogger } from '../lib/index.js'
import nock from 'nock'
import { mockEthServer } from '../test/mock-eth-server.js'
import * as ELMocks from '../services/execution-api/fixtures.js'
import * as CLMocks from '../services/consensus-api/fixtures.js'
import dotenv from 'dotenv'
import { configBase } from '../test/config.js'
import type { Dependencies } from './interface.js'

dotenv.config()

const mockConfig = async (config) => {
  const { makeConfig } = (await vi.importActual(
    '../services/config/service.js'
  )) as typeof import('../services/config/service.js')

  vi.doMock('../services/config/service.js', () => {
    return {
      makeConfig() {
        return {
          ...makeConfig({
            env: { ...configBase, ...config },
            logger: makeLogger({
              level: 'error',
              format: 'simple',
            }),
          }),
          HTTP_PORT: undefined,
        }
      },
      makeLoggerConfig() {
        return {
          level: 'debug',
          format: 'simple',
        }
      },
      makeWebhookProcessorConfig() {
        return {
          WEBHOOK_ABORT_TIMEOUT_MS: 10_000,
          WEBHOOK_MAX_RETRIES: 0,
        }
      },
    }
  })
}

const getApp = async () => {
  const { makeAppModule } = await import('./module.js')
  return makeAppModule()
}

describe('App bootstrap', () => {
  beforeEach(() => {
    Object.values(ELMocks).forEach((mock) => {
      mockEthServer(mock() as any, configBase.EXECUTION_NODE)
    })
    Object.values(CLMocks).forEach((mock) => {
      mockEthServer(mock() as any, configBase.CONSENSUS_NODE)
    })
    vi.resetModules()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('should bootstrap the app with MESSAGES_LOCATION', async () => {
    await mockConfig({
      MESSAGES_LOCATION: 'encryptor',
      VALIDATOR_EXIT_WEBHOOK: undefined,
      PROM_PREFIX: 'test',
    })

    const module = await getApp()
    await module.run()
    await module.destroy()
  })

  it('should bootstrap the app with VALIDATOR_EXIT_WEBHOOK', async () => {
    await mockConfig({
      MESSAGES_LOCATION: undefined,
      VALIDATOR_EXIT_WEBHOOK: 'https://example.com/webhook',
      PROM_PREFIX: 'test_2',
    })

    const module = await getApp()
    await module.run()
    await module.destroy()
  })

  it('should throw an error if both MESSAGES_LOCATION and VALIDATOR_EXIT_WEBHOOK are defined', async () => {
    await mockConfig({
      MESSAGES_LOCATION: 'messages',
      VALIDATOR_EXIT_WEBHOOK: 'https://example.com/webhook',
      PROM_PREFIX: 'test_3',
    })

    await expect(getApp).rejects.toThrowError(
      'Both MESSAGES_LOCATION and VALIDATOR_EXIT_WEBHOOK are defined. Ensure only one is set.'
    )
  })

  it('should throw an error if neither MESSAGES_LOCATION nor VALIDATOR_EXIT_WEBHOOK are defined', async () => {
    await mockConfig({
      MESSAGES_LOCATION: undefined,
      VALIDATOR_EXIT_WEBHOOK: undefined,
      PROM_PREFIX: 'test_4',
    })

    await expect(getApp).rejects.toThrowError(
      'Neither MESSAGES_LOCATION nor VALIDATOR_EXIT_WEBHOOK are defined. Please set one of them.'
    )
  })
}, 100_000)

describe('App startup record', () => {
  it('holds the build info and the logger and webhook config, masked', async () => {
    const { makeApp } = await import('./service.js')
    const token = 'generated-webhook-token'
    const loggerConfig = {
      LOGGER_LEVEL: 'info' as const,
      LOGGER_FORMAT: 'json' as const,
      LOGGER_SECRETS: [token],
    }
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const app = makeApp({
      config: { MESSAGES_LOCATION: 'messages', EJECTOR_SCOPE: [] },
      loggerConfig,
      webhookConfig: {
        WEBHOOK_ABORT_TIMEOUT_MS: 10_000,
        WEBHOOK_MAX_RETRIES: 0,
        WEBHOOK_TOKEN: token,
        WEBHOOK_HEADER: 'Authorization',
      },
      logger: makeLogger({
        level: 'info',
        format: 'json',
        sanitizer: { secrets: loggerConfig.LOGGER_SECRETS },
      }),
      appInfoReader: {
        getVersion: async () => '0.0.0',
        getBuildInfo: async () => ({ branch: 'main', commit: 'abc1234' }),
      },
      metrics: { buildInfo: { labels: () => ({ inc: () => undefined }) } },
      consistencyChecker: {
        checkChainIds: async () => {
          throw new Error('stop after the startup record')
        },
      },
    } as unknown as Dependencies)

    try {
      await expect(app.run()).rejects.toThrow('stop after the startup record')

      const line = String(log.mock.calls[0][0])
      expect(JSON.parse(line).details).toMatchObject({
        version: '0.0.0',
        branch: 'main',
        commit: 'abc1234',
        LOGGER_LEVEL: 'info',
        LOGGER_FORMAT: 'json',
        WEBHOOK_HEADER: 'Authorization',
        WEBHOOK_TOKEN: '*'.repeat(token.length),
      })
      expect(line).not.toContain(token)
    } finally {
      log.mockRestore()
    }
  })
})
