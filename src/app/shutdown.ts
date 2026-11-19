import type { LoggerService } from '../lib/index.js'

/**
 * The Docker image runs Node as PID 1. Linux applies no default action to
 * SIGTERM and SIGINT for PID 1, so without these handlers a container stop
 * waits for the grace period and ends with SIGKILL (exit code 137).
 *
 * The daemon keeps no durable state, so it exits at once.
 */
export const exitOnShutdownSignals = (logger: Pick<LoggerService, 'info'>) => {
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      logger.info(`Received ${signal}, shutting down`)
      process.exit(0)
    })
  }
}
