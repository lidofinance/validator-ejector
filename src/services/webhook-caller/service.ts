import { LoggerService, RequestService } from 'lido-nanolib'
import { MetricsService } from '../prom/service.js'

export type WebhookProcessorService = ReturnType<typeof makeWebhookProcessor>

export const makeWebhookProcessor = (
  request: RequestService,
  logger: LoggerService,
  metrics: MetricsService
) => {
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
