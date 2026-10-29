import { makeBootstrapLogger } from './app/bootstrap-logger.js'
import { makeAppModule } from './app/module.js'

const bootstrap = async () => {
  const defaultLogger = makeBootstrapLogger(process.env)
  try {
    const module = await makeAppModule()
    await module.run()
  } catch (error) {
    defaultLogger.error('Startup error', error)
    process.exit(1)
  }
}

bootstrap()
