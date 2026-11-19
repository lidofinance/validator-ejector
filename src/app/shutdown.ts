import type { LoggerService } from '../lib/index.js'

/**
 * The Docker image runs Node as PID 1. Linux applies no default action to
 * SIGTERM and SIGINT for PID 1, so without these handlers a container stop
 * waits for the grace period and ends with SIGKILL (exit code 137).
 */
export const exitOnShutdownSignals = (logger: Pick<LoggerService, 'info'>) => {
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      logger.info(`Received ${signal}, shutting down`)
      // Exit at once on purpose. Writes to a pipe are asynchronous, so log
      // lines still queued for a full pipe can be lost. That is fine: there
      // is no state to save, and the next start reloads the exit requests.
      process.exit(0)
    })
  }
}
