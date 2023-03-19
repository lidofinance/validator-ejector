import { LoggerService, RequestService } from 'lido-nanolib'

export type WebhookProcessorService = ReturnType<typeof makeWebhookProcessor>

export const makeWebhookProcessor = (
  request: RequestService,
  logger: LoggerService,
  { WEBHOOK_ENDPOINT }: { WEBHOOK_ENDPOINT?: string }
) => {
  const send = async (event: {
    validatorIndex: string
    validatorPubkey: string
  }) => {
    if (!WEBHOOK_ENDPOINT) {
      logger.debug(`Webhook endpoint doesn't provided`)
      return
    }
    await request(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  }
  return {
    send,
  }
}
