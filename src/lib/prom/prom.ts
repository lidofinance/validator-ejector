import http from 'http'
import url from 'url'
import client from 'prom-client'

export const register = new client.Registry()

register.setDefaultLabels({
  app: 'validator-ejector',
})

client.collectDefaultMetrics({ register })

export const serveMetrics = (port: number) => {
  http
    .createServer(async (req, res) => {
      const path = req.url || '/'
      const route = url.parse(path).pathname
      if (route === '/metrics') {
        res.setHeader('Content-Type', register.contentType)
        res.end(await register.metrics())
      }
    })
    .listen(port)
}
