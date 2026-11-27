import nock from 'nock'
import { Histogram, Registry } from '@prometheus-io/client'
import { makeWebhookProcessor } from './service.js'
import { mockLogger } from '../../test/logger.js'

describe('WebhookProcessor', () => {
  const event = {
    validatorIndex: '123',
    validatorPubkey: '0xabc',
  }

  const registry = new Registry()
  const webhookRequestDurationSeconds = new Histogram({
    name: 'webhook_request_duration_seconds',
    help: 'help',
    labelNames: ['result', 'status', 'domain'],
    registers: [registry],
  })

  const makeProcessor = (token?: string, header?: string) =>
    makeWebhookProcessor(
      {
        WEBHOOK_ABORT_TIMEOUT_MS: 5000,
        WEBHOOK_MAX_RETRIES: 0,
        WEBHOOK_TOKEN: token,
        WEBHOOK_HEADER: header,
      },
      mockLogger(),
      { exitActions: { inc: vi.fn() }, webhookRequestDurationSeconds } as any
    )

  afterEach(() => {
    nock.cleanAll()
    registry.resetMetrics()
  })

  it('records a failed webhook call with its status', async () => {
    nock('http://webhook.example').post('/exit').reply(500, 'oops')

    await makeProcessor().send('http://webhook.example/exit', event)

    const metric = await registry.getSingleMetricAsString(
      'webhook_request_duration_seconds'
    )
    expect(metric).toContain('result="error"')
    expect(metric).toContain('status="500"')
    expect(metric).toContain('domain="webhook.example"')
  })

  it('sends the event without Authorization header by default', async () => {
    let authHeader: string | undefined
    const scope = nock('http://webhook.example')
      .post('/exit', JSON.stringify(event))
      .reply(200, (request: Request) => {
        authHeader = request.headers.get('authorization') ?? undefined
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
      .reply(200, (request: Request) => {
        authHeader = request.headers.get('authorization') ?? undefined
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
      .reply(200, (request: Request) => {
        apiKeyHeader = request.headers.get('x-api-key') ?? undefined
        authHeader = request.headers.get('authorization') ?? undefined
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
