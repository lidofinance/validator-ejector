import http from 'http'
import net from 'net'
import { Registry } from 'prom-client'
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

const startHandler = async (register: Registry) => {
  const port = await getFreePort()
  await makeHttpHandler({
    register,
    config: {
      HTTP_PORT: port,
      RUN_METRICS: true,
      RUN_HEALTH_CHECK: true,
    } as any,
  }).run()
  return port
}

describe('http handler', () => {
  for (const target of ['http://%FF@localhost/', '//%FF@localhost/']) {
    it(`answers 400 to malformed target ${target} and keeps serving`, async () => {
      const port = await startHandler(new Registry())

      expect(await getStatus(port, '/health')).toBe(200)
      expect(await getStatus(port, target)).toBe(400)
      expect(await getStatus(port, '/health')).toBe(200)
    })
  }

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
