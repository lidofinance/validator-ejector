import http from 'http'
import net from 'net'

export const getFreePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = net.createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo
      server.close(() => resolve(port))
    })
  })

export const getStatus = (port: number, path: string) =>
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
