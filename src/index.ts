import { makeLogger } from './lib/index.js'
import { makeAppModule } from './app/module.js'
import { exitOnShutdownSignals } from './app/shutdown.js'

const bootstrap = async () => {
  const defaultLogger = makeLogger({
    level: 'debug',
    format: 'simple',
  })
  // Before startup, so a stop during the initial event load also works.
  exitOnShutdownSignals(defaultLogger)
  try {
    const module = await makeAppModule()
    await module.run()
  } catch (error) {
    defaultLogger.error('Startup error', error)
    process.exit(1)
  }
}

bootstrap()
