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
          // The callback must never reject: an unhandled rejection
          // terminates the process and stops exit processing.
          let route: string | null
          try {
            route = url.parse(req.url || '/').pathname
          } catch {
            res.statusCode = 400
            return res.end()
          }
          try {
            if (RUN_METRICS && route === '/metrics') {
              res.setHeader('Content-Type', register.contentType)
              return res.end(await register.metrics())
            }
            if (RUN_HEALTH_CHECK && route === '/health') {
              res.setHeader('Content-Type', 'application/json')
              return res.end(JSON.stringify({ status: 'ok' }))
            }
            res.statusCode = 404
            res.end()
          } catch {
            res.statusCode = 500
            res.end()
          }
        })
        .listen(HTTP_PORT)
    },
  }
}
