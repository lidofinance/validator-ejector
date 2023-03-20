import { LoggerService, RequestService } from 'lido-nanolib'

export type WebhookProcessorService = ReturnType<typeof makeWebhookProcessor>

export const makeWebhookProcessor = (
  request: RequestService,
  logger: LoggerService,
  { VALIDATOR_EXIT_WEBHOOK }: { VALIDATOR_EXIT_WEBHOOK?: string }
) => {
  const send = async (event: {
    validatorIndex: string
    validatorPubkey: string
  }) => {
    if (!VALIDATOR_EXIT_WEBHOOK) {
      logger.debug(`Webhook endpoint doesn't provided`)
      return
    }
    await request(VALIDATOR_EXIT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  }
  return {
    send,
  }
}
