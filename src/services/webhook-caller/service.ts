import {
  LoggerService,
  makeRequest,
  logger as loggerMiddleware,
  abort,
  notOkError,
  retry,
} from '../../lib/index.js'
import { MetricsService } from '../prom/service.js'

export type WebhookProcessorService = ReturnType<typeof makeWebhookProcessor>

export const makeWebhookProcessor = (
  config: { WEBHOOK_ABORT_TIMEOUT_MS: number; WEBHOOK_MAX_RETRIES: number },
  logger: LoggerService,
  metrics: MetricsService
) => {
  let middlewares = [
    loggerMiddleware(logger),
    notOkError(),
    abort(config.WEBHOOK_ABORT_TIMEOUT_MS),
  ]

  if (config.WEBHOOK_MAX_RETRIES > 0) {
    middlewares = [retry(config.WEBHOOK_MAX_RETRIES)].concat(middlewares)
  }

  const request = makeRequest(middlewares)
  const send = async (
    url: string,
    event: {
      validatorIndex: string
      validatorPubkey: string
    }
  ) => {
    try {
      await request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      })
      logger.info('Voluntary exit webhook called successfully', event)
      metrics.exitActions.inc({ result: 'success' })
    } catch (e) {
      logger.error('Failed to call the exit webhook', e)
      metrics.exitActions.inc({ result: 'error' })
    }
  }
  return {
    send,
  }
}
