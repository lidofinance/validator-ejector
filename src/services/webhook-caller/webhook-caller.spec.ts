import nock from 'nock'
import { makeWebhookProcessor } from './service.js'
import { mockLogger } from '../../test/logger.js'

describe('WebhookProcessor', () => {
  const event = {
    validatorIndex: '123',
    validatorPubkey: '0xabc',
  }

  const makeProcessor = (token?: string, header?: string) =>
    makeWebhookProcessor(
      {
        WEBHOOK_ABORT_TIMEOUT_MS: 5000,
        WEBHOOK_MAX_RETRIES: 0,
        WEBHOOK_TOKEN: token,
        WEBHOOK_HEADER: header,
      },
      mockLogger(),
      { exitActions: { inc: vi.fn() } } as any
    )

  afterEach(() => {
    nock.cleanAll()
  })

  it('sends the event without Authorization header by default', async () => {
    let authHeader: string | undefined
    const scope = nock('http://webhook.example')
      .post('/exit', JSON.stringify(event))
      .reply(200, function () {
        authHeader = this.req.headers.authorization
        return {}
      })

    await makeProcessor().send('http://webhook.example/exit', event)

    expect(scope.isDone()).toBe(true)
    expect(authHeader).toBeUndefined()
  })

  it('sends a bearer token when WEBHOOK_TOKEN is configured', async () => {
    let authHeader: string | undefined
    const scope = nock('http://webhook.example')
      .post('/exit', JSON.stringify(event))
      .reply(200, function () {
        authHeader = this.req.headers.authorization
        return {}
      })

    await makeProcessor('secret-token').send(
      'http://webhook.example/exit',
      event
    )

    expect(scope.isDone()).toBe(true)
    expect(authHeader).toBe('Bearer secret-token')
  })

  it('sends a raw token in a custom header when WEBHOOK_HEADER is configured', async () => {
    let apiKeyHeader: string | undefined
    let authHeader: string | undefined
    const scope = nock('http://webhook.example')
      .post('/exit', JSON.stringify(event))
      .reply(200, function () {
        apiKeyHeader = this.req.headers['x-api-key'] as string | undefined
        authHeader = this.req.headers.authorization
        return {}
      })

    await makeProcessor('secret-token', 'X-Api-Key').send(
      'http://webhook.example/exit',
      event
    )

    expect(scope.isDone()).toBe(true)
    expect(apiKeyHeader).toBe('secret-token')
    expect(authHeader).toBeUndefined()
  })
})
