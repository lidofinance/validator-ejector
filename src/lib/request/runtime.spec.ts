import http from 'node:http'
import https from 'node:https'
import type { AddressInfo } from 'node:net'
import { Histogram, Registry } from '@prometheus-io/client'

import { createTlsCertificate } from '../../test/tls-certificate.js'
import { makeRequest } from './index.js'
import { abort, notOkError, prom, retry } from './middlewares.js'

describe('Request middleware on real Node HTTP and TLS sockets', () => {
  const { key, cert } = createTlsCertificate()
  const servers: http.Server[] = []
  const agents: https.Agent[] = []

  const listen = async (server: http.Server, protocol = 'http') => {
    servers.push(server)
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    return `${protocol}://127.0.0.1:${(server.address() as AddressInfo).port}`
  }

  afterEach(async () => {
    agents.splice(0).forEach((agent) => agent.destroy())
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.closeAllConnections()
            server.close((error) => (error ? reject(error) : resolve()))
          })
      )
    )
  })

  it.each([408, 429, 500, 503])(
    'retries HTTP %i and records both failures and the successful response',
    async (status) => {
      let attempts = 0
      const url = await listen(
        http.createServer((_req, res) => {
          res.setHeader('Content-Type', 'application/json')
          if (++attempts < 3) {
            res.statusCode = status
            res.end(JSON.stringify({ message: 'try again' }))
          } else {
            res.end(JSON.stringify({ ok: true }))
          }
        })
      )
      const registry = new Registry()
      const histogram = new Histogram({
        name: 'request_duration_seconds',
        help: 'Request duration',
        labelNames: ['result', 'status', 'domain'],
        registers: [registry],
      })
      const request = makeRequest([
        retry(3, { ignoreAbort: true, sleep: 0 }),
        prom(histogram),
        notOkError(),
        abort(1000),
      ])

      await expect((await request(url)).json()).resolves.toEqual({ ok: true })
      expect(attempts).toBe(3)
      const { values } = await histogram.get()
      expect(values).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            metricName: 'request_duration_seconds_count',
            value: 2,
            labels: { result: 'error', status: 'unknown', domain: '127.0.0.1' },
          }),
          expect.objectContaining({
            metricName: 'request_duration_seconds_count',
            value: 1,
            labels: { result: 'success', status: 200, domain: '127.0.0.1' },
          }),
        ])
      )
    },
    5000
  )

  it.each([400, 404])(
    'does not retry terminal HTTP %i',
    async (status) => {
      let attempts = 0
      const url = await listen(
        http.createServer((_req, res) => {
          attempts++
          res.writeHead(status, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ message: 'terminal failure' }))
        })
      )
      const request = makeRequest([
        retry(3, { ignoreAbort: true, sleep: 0 }),
        notOkError(),
        abort(1000),
      ])

      await expect(request(url)).rejects.toMatchObject({
        statusCode: status,
        message: 'terminal failure',
      })
      expect(attempts).toBe(1)
    },
    5000
  )

  it('stops retrying a server error after the configured attempt count', async () => {
    let attempts = 0
    const url = await listen(
      http.createServer((_req, res) => {
        attempts++
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ message: 'unavailable' }))
      })
    )
    const request = makeRequest([
      retry(3, { ignoreAbort: true, sleep: 0 }),
      notOkError(),
      abort(1000),
    ])

    await expect(request(url)).rejects.toMatchObject({ statusCode: 503 })
    expect(attempts).toBe(3)
  }, 5000)

  it('retries a closed upstream socket', async () => {
    let attempts = 0
    const url = await listen(
      http.createServer((req, res) => {
        if (++attempts === 1) req.socket.destroy()
        else res.end('recovered')
      })
    )
    const request = makeRequest([
      retry(3, { ignoreAbort: true, sleep: 0 }),
      notOkError(),
      abort(1000),
    ])

    await expect((await request(url)).text()).resolves.toBe('recovered')
    expect(attempts).toBe(2)
  }, 5000)

  it('aborts a stalled response without retry when ignoreAbort is false', async () => {
    let attempts = 0
    const url = await listen(
      http.createServer(() => {
        attempts++
      })
    )
    const request = makeRequest([
      retry(3, { ignoreAbort: false, sleep: 0 }),
      abort(150),
    ])

    await expect(request(url)).rejects.toMatchObject({ name: 'AbortError' })
    expect(attempts).toBe(1)
  }, 5000)

  it('uses a fresh abort signal on each retry of a stalled response', async () => {
    let attempts = 0
    const url = await listen(
      http.createServer((_req, res) => {
        if (++attempts === 3) res.end('recovered')
      })
    )
    const request = makeRequest([
      retry(3, { ignoreAbort: true, sleep: 0 }),
      abort(150),
    ])

    await expect((await request(url)).text()).resolves.toBe('recovered')
    expect(attempts).toBe(3)
  }, 5000)

  it('rejects an untrusted HTTPS certificate before sending an HTTP request', async () => {
    let requests = 0
    const url = await listen(
      https.createServer({ key, cert }, (_req, res) => {
        requests++
        res.end('must not be received')
      }),
      'https'
    )

    await expect(makeRequest([abort(1000)])(url)).rejects.toMatchObject({
      name: 'FetchError',
      code: 'DEPTH_ZERO_SELF_SIGNED_CERT',
    })
    expect(requests).toBe(0)
  }, 5000)

  it('accepts the same HTTPS certificate when its CA is explicitly trusted', async () => {
    const url = await listen(
      https.createServer({ key, cert }, (_req, res) => res.end('trusted')),
      'https'
    )
    const agent = new https.Agent({ ca: cert })
    agents.push(agent)

    const response = await makeRequest([notOkError(), abort(1000)])(url, {
      agent,
    })
    await expect(response.text()).resolves.toBe('trusted')
  }, 5000)
})
