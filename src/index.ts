// import { serveMetrics, config, logger } from './lib.js'
import { bootstrap } from './app/module.js'

// const { RUN_METRICS, METRICS_PORT } = config

process.on('SIGINT', () => {
  // logger.info('Shutting down')
  process.exit(0)
})

// if (RUN_METRICS && METRICS_PORT) {
//   serveMetrics(METRICS_PORT)
// }

bootstrap().catch((error) => {
  console.error('Startup error', error)
})
