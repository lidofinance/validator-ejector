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

  const exitMessages = new client.Counter({
    name: 'exit_messages',
    help: 'Exit messages and their validity: JSON parseability, structure and signature. Already exiting(ed) validator exit messages are not counted',
    labelNames: ['valid'] as const,
  })
  register.registerMetric(exitMessages)

  const exitActions = new client.Counter({
    name: 'exit_actions',
    help: 'Statuses of initiated validator exits',
    labelNames: ['result'] as const,
  })
  register.registerMetric(exitActions)

  const pollingLastBlocksDurationSeconds = new client.Histogram({
    name: 'polling_last_blocks_duration_seconds',
    help: 'Duration of pooling last blocks in microseconds',
    labelNames: ['eventsNumber'] as const,
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  })
  register.registerMetric(pollingLastBlocksDurationSeconds)

  const executionRequestDurationSeconds = new client.Histogram({
    name: 'execution_request_duration_seconds',
    help: 'Execution node request duration in microseconds',
    labelNames: ['result', 'status', 'domain'] as const,
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  })
  register.registerMetric(executionRequestDurationSeconds)

  const consensusRequestDurationSeconds = new client.Histogram({
    name: 'consensus_request_duration_seconds',
    help: 'Consensus node request duration in microseconds',
    labelNames: ['result', 'status', 'domain'] as const,
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  })
  register.registerMetric(consensusRequestDurationSeconds)

  const jobDuration = new client.Histogram({
    name: 'job_duration_seconds',
    help: 'Duration of cron jobs',
    labelNames: ['name', 'interval', 'result'] as const,
    buckets: [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 20],
  })
  register.registerMetric(jobDuration)

  return {
    exitMessages,
    exitActions,
    pollingLastBlocksDurationSeconds,
    executionRequestDurationSeconds,
    consensusRequestDurationSeconds,
    jobDuration,
  }
}
