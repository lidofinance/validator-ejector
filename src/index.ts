import { makeLogger } from './lib/index.js'
import { makeAppModule } from './app/module.js'

const bootstrap = async () => {
  const defaultLogger = makeLogger({
    level: 'debug',
    format: 'simple',
  })
  try {
    const module = await makeAppModule()
    await module.run()
  } catch (error) {
    defaultLogger.error('Startup error', error)
    process.exit(1)
  }
}

bootstrap()
