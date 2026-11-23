import http from 'http'
import net from 'net'
import { Registry } from '@prometheus-io/client'
import { makeHttpHandler } from './service.js'

const getFreePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = net.createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo
      server.close(() => resolve(port))
    })
  })

const getStatus = (port: number, path: string) =>
  new Promise<number>((resolve, reject) => {
    const req = http.get(
      { host: '127.0.0.1', port, path, timeout: 2000 },
      (res) => {
        res.resume()
        res.on('end', () => resolve(res.statusCode ?? 0))
      }
    )
    req.on('timeout', () => req.destroy(new Error(`no response to ${path}`)))
    req.on('error', reject)
  })

const servers: http.Server[] = []

const startHandler = async (register: Registry) => {
  const port = await getFreePort()
  const server = await makeHttpHandler({
    register,
    config: {
      HTTP_PORT: port,
      RUN_METRICS: true,
      RUN_HEALTH_CHECK: true,
    } as any,
  }).run()
  if (server) servers.push(server)
  return port
}

describe('http handler', () => {
  afterEach(async () => {
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

  it('routes by path and ignores the query string', async () => {
    const port = await startHandler(new Registry())

    expect(await getStatus(port, '/health?probe=1')).toBe(200)
    expect(await getStatus(port, '/metrics')).toBe(200)
    expect(await getStatus(port, '/unknown')).toBe(404)
    // Absolute-form target, as sent by a forward proxy.
    expect(await getStatus(port, 'http://example.com/health?x=1')).toBe(200)
  })

  it('answers 404 to unnormalized and 400 to malformed targets and keeps serving', async () => {
    const port = await startHandler(new Registry())

    expect(await getStatus(port, '/missing/../metrics')).toBe(404)
    expect(await getStatus(port, '//example.com/health')).toBe(404)
    expect(await getStatus(port, 'http://[/')).toBe(400)
    expect(await getStatus(port, '/health')).toBe(200)
  })

  it('answers 500 when metrics collection fails and keeps serving', async () => {
    const register = {
      contentType: 'text/plain',
      metrics: () => Promise.reject(new Error('collect failed')),
    } as unknown as Registry
    const port = await startHandler(register)

    expect(await getStatus(port, '/metrics')).toBe(500)
    expect(await getStatus(port, '/health')).toBe(200)
  })
})
