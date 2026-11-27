import type { Histogram } from '@prometheus-io/client'

import { makeLogger } from '../logger/index.js'

const jobLockMap: Record<string, boolean> = {}

export type JobRunnerService = ReturnType<typeof makeJobRunner>

export const makeJobRunner = <Initial>(
  name: string,
  {
    config,
    logger,
    metric,
    handler,
  }: {
    config: { JOB_INTERVAL: number }
    logger: ReturnType<typeof makeLogger>
    metric: Histogram<'name' | 'interval' | 'result'>
    handler: (handlerValue: Initial) => Promise<void>
  }
) => {
  /**
   * One run of the job. A failed run is counted in the metric. By default it
   * is logged as a warning and the next run retries; with `rethrow` the error
   * goes to the caller, for the initial run at start, whose failure must end
   * the process.
   */
  const once = async (
    handlerValue: Initial,
    { rethrow = false }: { rethrow?: boolean } = {}
  ) => {
    if (jobLockMap[name]) {
      if (rethrow) throw new Error(`Job ${name} is already running`)
      return
    }
    jobLockMap[name] = true

    const end = metric.startTimer({
      name,
      interval: config.JOB_INTERVAL,
    })

    try {
      logger.debug('Job started', { name })
      await handler(handlerValue)
      end({ result: 'success' })
    } catch (error) {
      end({ result: 'error' })
      if (rethrow) throw error
      logger.warn('Job ended with error', error)
    } finally {
      jobLockMap[name] = false
      logger.debug('Job ended', { name })
    }
  }

  const loop = (handlerValue: Initial) => {
    return setInterval(() => once(handlerValue), config.JOB_INTERVAL)
  }

  return {
    once,
    loop,
  }
}
