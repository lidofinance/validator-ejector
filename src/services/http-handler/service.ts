import http from 'http'
import url from 'url'

import type { Registry } from 'prom-client'
import type { ConfigService } from 'services/config/service'

export type HttpHandlerService = ReturnType<typeof makeHttpHandler>

export const makeHttpHandler = ({
  register,
  config: { HTTP_PORT, RUN_METRICS, RUN_HEALTH_CHECK },
}: {
  register: Registry
  config: ConfigService
}) => {
  return {
    async run() {
      if (!HTTP_PORT) return

      http
        .createServer(async (req, res) => {
          const path = req.url || '/'
          const route = url.parse(path).pathname
          if (RUN_METRICS && route === '/metrics') {
            res.setHeader('Content-Type', register.contentType)
            res.end(await register.metrics())
          }
          if (RUN_HEALTH_CHECK && route === '/health') {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ status: 'ok' }))
          }
        })
        .listen(HTTP_PORT)
    },
  }
}
