import http from 'http'
import url from 'url'
import client from 'prom-client'

export const register = new client.Registry()
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

export type MetricsService = ReturnType<typeof makeMetrics>

export const makeMetrics = ({
  RUN_METRICS,
  METRICS_PORT,
}: {
  RUN_METRICS?: boolean
  METRICS_PORT?: number
}) => {
  if (RUN_METRICS && METRICS_PORT) {
    serveMetrics(METRICS_PORT)
  }

  register.setDefaultLabels({
    app: 'validator-ejector',
  })

  client.collectDefaultMetrics({ register })

  const pollingLastBlocksDurationSeconds = new client.Histogram({
    name: 'polling_last_blocks_duration_seconds',
    help: 'Duration of pooling last blocks in microseconds',
    labelNames: ['eventsNumber'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  })
  register.registerMetric(pollingLastBlocksDurationSeconds)

  const requestDurationSeconds = new client.Histogram({
    name: 'request_duration_seconds',
    help: 'Request duration in microseconds',
    labelNames: ['result', 'status', 'domain'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  })
  register.registerMetric(requestDurationSeconds)

  const jsonRPCDurationSeconds = new client.Histogram({
    name: 'json_rpc_duration_seconds',
    help: 'JSON RPC duration in microseconds',
    labelNames: ['result'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  })
  register.registerMetric(jsonRPCDurationSeconds)

  const jobDuration = new client.Histogram({
    name: 'job_duration_seconds',
    help: 'Duration of cron jobs',
    buckets: [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 20],
    labelNames: ['name', 'interval', 'result'] as const,
  })
  register.registerMetric(jobDuration)

  return {
    pollingLastBlocksDurationSeconds,
    requestDurationSeconds,
    jobDuration,
    jsonRPCDurationSeconds,
  }
}
