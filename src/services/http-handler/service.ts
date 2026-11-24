import http from 'http'

import type { Registry } from '@prometheus-io/client'
import type { LoggerService } from '../../lib/index.js'
import type { ConfigService } from 'services/config/service'

export type HttpHandlerService = ReturnType<typeof makeHttpHandler>

export const makeHttpHandler = ({
  register,
  logger,
  config: { HTTP_PORT, RUN_METRICS, RUN_HEALTH_CHECK },
}: {
  register: Registry
  logger: LoggerService
  config: ConfigService
}) => {
  return {
    async run() {
      if (!HTTP_PORT) return

      return http
        .createServer(async (req, res) => {
          // The callback must never reject: an unhandled rejection
          // terminates the process and stops exit processing.
          const path = req.url || '/'
          // Origin-form path is not normalized, as with url.parse.
          const route = path.startsWith('/')
            ? path.split(/[?#]/, 1)[0]
            : URL.parse(path)?.pathname
          if (route === undefined) {
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
          } catch (error) {
            logger.error(`Failed to serve ${route}`, error)
            res.statusCode = 500
            return res.end()
          }
          res.statusCode = 404
          res.end()
        })
        .listen(HTTP_PORT)
    },
  }
}
