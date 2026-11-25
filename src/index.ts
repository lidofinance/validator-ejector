import { makeAppModule } from './app/module.js'
import { makeStartupLogger } from './app/logger.js'
import { exitOnShutdownSignals } from './app/shutdown.js'

const bootstrap = async () => {
  const startupLogger = makeStartupLogger(process.env)
  try {
    const appModule = await makeAppModule()
    // run() can take minutes to load the initial events.
    exitOnShutdownSignals(appModule.logger)
    await appModule.run()
  } catch (error) {
    startupLogger.error('Startup error', error)
    process.exit(1)
  }
}

bootstrap()
