import client from 'prom-client'

import type { MessageStorage } from '../job-processor/message-storage.js'

export const register = new client.Registry()

export type MetricsService = ReturnType<typeof makeMetrics>

export const makeMetrics = ({
  PREFIX = 'validator_ejector_',
}: {
  PREFIX?: string
}) => {
  register.setDefaultLabels({
    app: 'validator-ejector',
  })
  client.collectDefaultMetrics({ register })

  const exitMessages = new client.Counter({
    name: PREFIX + 'exit_messages',
    help: 'Exit messages and their validity: JSON parseability, structure and signature.',
    labelNames: ['valid'] as const,
  })
  register.registerMetric(exitMessages)
  exitMessages.labels('true').inc(0)
  exitMessages.labels('false').inc(0)

  const exitActions = new client.Counter({
    name: PREFIX + 'exit_actions',
    help: 'Statuses of initiated validator exits',
    labelNames: ['result'] as const,
  })
  register.registerMetric(exitActions)
  exitActions.labels('success').inc(0)
  exitActions.labels('error').inc(0)

  const eventSecurityVerification = new client.Counter({
    name: PREFIX + 'event_security_verification',
    help: 'Statuses of exit event security verifications',
    labelNames: ['result'] as const,
  })
  register.registerMetric(eventSecurityVerification)
  eventSecurityVerification.labels('success').inc(0)
  eventSecurityVerification.labels('error').inc(0)

  const pollingLastBlocksDurationSeconds = new client.Histogram({
    name: PREFIX + 'polling_last_blocks_duration_seconds',
    help: 'Duration of polling last blocks in seconds',
    labelNames: ['eventsNumber'] as const,
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  })
  register.registerMetric(pollingLastBlocksDurationSeconds)

  const executionRequestDurationSeconds = new client.Histogram({
    name: PREFIX + 'execution_request_duration_seconds',
    help: 'Execution node request duration in seconds',
    labelNames: ['result', 'status', 'domain'] as const,
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  })
  register.registerMetric(executionRequestDurationSeconds)

  const consensusRequestDurationSeconds = new client.Histogram({
    name: PREFIX + 'consensus_request_duration_seconds',
    help: 'Consensus node request duration in seconds',
    labelNames: ['result', 'status', 'domain'] as const,
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  })
  register.registerMetric(consensusRequestDurationSeconds)

  const jobEjectorCycleDuration = new client.Histogram({
    name: PREFIX + 'job_duration_seconds',
    help: 'Duration of cron jobs',
    labelNames: ['name', 'interval', 'result'] as const,
    buckets: [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 20],
  })
  register.registerMetric(jobEjectorCycleDuration)

  const jobMessageReloaderDuration = new client.Histogram({
    name: PREFIX + 'job_message_reloader_duration_seconds',
    help: 'Duration of message reloader cron job',
    labelNames: ['name', 'interval', 'result'] as const,
    buckets: [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 20],
  })
  register.registerMetric(jobEjectorCycleDuration)

  const exitMessagesLeftNumber = new client.Gauge({
    name: PREFIX + 'exit_messages_left_number',
    help: 'Number of exit messages left',
  })
  register.registerMetric(exitMessagesLeftNumber)

  const exitMessagesLeftPercent = new client.Gauge({
    name: PREFIX + 'exit_messages_left_percent',
    help: 'Percentage of exit messages left',
  })
  register.registerMetric(exitMessagesLeftPercent)

  const updateLeftMessages = (
    messageStorage: MessageStorage,
    lastRequestedIx: number
  ) => {
    const numberLeft = messageStorage.messages.filter(
      (msg) => parseInt(msg.message.validator_index) > lastRequestedIx
    ).length
    exitMessagesLeftNumber.set(numberLeft)

    const percentLeft =
      messageStorage.size > 0 ? (numberLeft / messageStorage.size) * 100 : 0
    exitMessagesLeftPercent.set(percentLeft)
  }

  return {
    exitMessages,
    exitActions,
    eventSecurityVerification,
    pollingLastBlocksDurationSeconds,
    executionRequestDurationSeconds,
    consensusRequestDurationSeconds,
    jobEjectorCycleDuration,
    jobMessageReloaderDuration,
    updateLeftMessages,
  }
}
