import { makeLogger } from 'lido-nanolib'
import { makeConfig as mC } from '../services/config/service.js'
import dotenv from 'dotenv'

dotenv.config()

const mockConfig = async (config) => {
  const { makeConfig } = (await vi.importActual(
    '../services/config/service.js'
  )) as { makeConfig: typeof mC }

  vi.doMock('../services/config/service.js', () => {
    return {
      makeConfig() {
        return {
          ...makeConfig({
            env: { ...process.env, ...config },
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
    }
  })
}

const getApp = async () => {
  const { makeAppModule } = await import('./module.js')
  return makeAppModule()
}

describe('App bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should bootstrap the app with MESSAGES_LOCATION', async () => {
    await mockConfig({
      MESSAGES_LOCATION: 'messages',
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
