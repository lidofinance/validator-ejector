#!/usr/bin/env node

import { makeLogger } from './lib/index.js'
import { makeAppModule } from './app/module.js'
import { exitOnShutdownSignals } from './app/shutdown.js'

const bootstrap = async () => {
  const defaultLogger = makeLogger({
    level: 'debug',
    format: 'simple',
  })
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
