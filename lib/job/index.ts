import { logger } from 'ethers'
import { makeLogger } from '../logger'

const jobLockMap: Record<string, boolean> = {}

export const makeJobRunner = (
  name: string,
  di: {
    config: { JOB_INTERVAL: number }
    logger: ReturnType<typeof makeLogger>
  },
  initial: { start: number; pooling: number }
) => {
  // TODO: prom
  return async (cb: (handlerValue: number) => Promise<void>) => {
    const handler = async (handlerValue: number) => {
      if (jobLockMap[name]) return
      jobLockMap[name] = true

      try {
        logger.debug('Job started', { name })
        await cb(handlerValue)
      } catch (error) {
        logger.warn('Job ended with error', error)
      } finally {
        jobLockMap[name] = false
        logger.debug('Job ended', { name })
      }
    }
    await handler(initial.start)
    setInterval(handler, di.config.JOB_INTERVAL, initial.pooling)
  }
}
