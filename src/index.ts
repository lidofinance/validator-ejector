import { serveMetrics, config, logger } from './lib.js'
import { run } from './app/index.js'

const { RUN_METRICS, METRICS_PORT } = config

process.on('SIGINT', () => {
  logger.info('Shutting down')
  process.exit(0)
})

if (RUN_METRICS && METRICS_PORT) {
  serveMetrics(METRICS_PORT)
}

run().catch((error) => {
  logger.error('Startup error', error)
})
