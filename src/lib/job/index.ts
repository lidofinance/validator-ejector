import type { Histogram } from 'prom-client'

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
    metric: Histogram
    handler: (handlerValue: Initial) => Promise<void>
  }
) => {
  const once = async (handlerValue: Initial) => {
    if (jobLockMap[name]) return
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
      logger.warn('Job ended with error', error)
      end({ result: 'error' })
    } finally {
      jobLockMap[name] = false
      logger.debug('Job ended', { name })
    }
  }

  const pooling = (handlerValue: Initial) => {
    return setInterval(() => once(handlerValue), config.JOB_INTERVAL)
  }

  return {
    once,
    pooling,
  }
}
