import { makeBootstrapLogger } from './app/bootstrap-logger.js'
import { makeAppModule } from './app/module.js'
import { exitOnShutdownSignals } from './app/shutdown.js'

const bootstrap = async () => {
  const defaultLogger = makeBootstrapLogger(process.env)
  try {
    const appModule = await makeAppModule()
    // run() can take minutes to load the initial events.
    exitOnShutdownSignals(appModule.logger)
    await appModule.run()
  } catch (error) {
    defaultLogger.error('Startup error', error)
    process.exit(1)
  }
}

bootstrap()
