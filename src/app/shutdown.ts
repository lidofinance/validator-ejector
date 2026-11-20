import type { LoggerService } from '../lib/index.js'

/** The longest time a stop waits for the queued log lines. */
export const FLUSH_TIMEOUT_MS = 2_000

// An empty write queues behind all earlier writes, so its callback runs
// only after they are handed to the operating system.
const flushed = (stream: NodeJS.WriteStream) =>
  new Promise<void>((resolve) => stream.write('', () => resolve()))

/**
 * The Docker image runs Node as PID 1. Linux applies no default action to
 * SIGTERM and SIGINT for PID 1, so without these handlers a container stop
 * waits for the grace period and ends with SIGKILL (exit code 137).
 *
 * The daemon keeps no state, and the next start reloads the exit requests,
 * so it does not wait for the work in progress. It waits only for the
 * queued log lines: writes to a pipe are asynchronous, and process.exit()
 * drops them. A reader that stopped reading cannot hold the stop longer
 * than the timeout.
 */
export const exitOnShutdownSignals = (
  logger: Pick<LoggerService, 'info'>,
  flushTimeoutMs = FLUSH_TIMEOUT_MS
) => {
  let stopping = false
  const shutdown = async (signal: NodeJS.Signals) => {
    // A repeated or another signal does not start a second stop. The
    // listener stays, so the signal cannot end the process by its default
    // action during the wait.
    if (stopping) return
    stopping = true
    logger.info(`Received ${signal}, shutting down`)
    await Promise.race([
      Promise.all([flushed(process.stdout), flushed(process.stderr)]),
      new Promise((resolve) => setTimeout(resolve, flushTimeoutMs)),
    ])
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
