import client from '@prometheus-io/client'

import { MessageStorage } from '../job-processor/message-storage.js'
import { makeMetrics, register } from './service.js'

describe('Prometheus client compatibility', () => {
  afterEach(() => {
    register.clear()
    client.register.clear()
  })

  it('keeps application metric names, values, labels, and exposition format', async () => {
    const metrics = makeMetrics({})
    metrics.buildInfo.labels({ version: 'fixture', mode: 'message' }).inc()
    metrics.exitMessages.labels('true').inc(2)
    metrics.exitActions.labels('success').inc()
    metrics.eventSecurityVerification.labels('error').inc()
    metrics.updateLeftMessages(new MessageStorage(), 0)

    const text = await register.metrics()
    expect(register.contentType).toContain('text/plain')
    expect(text).toContain('# TYPE validator_ejector_build_info gauge')
    expect(text).toContain('# TYPE validator_ejector_exit_messages counter')
    expect(text).toContain(
      '# TYPE validator_ejector_execution_request_duration_seconds histogram'
    )
    expect(text).toContain('nodejs_heap_size_total_bytes')

    const values = await register.getMetricsAsJSON()
    const metric = (name: string) => values.find((item) => item.name === name)
    expect(metric('validator_ejector_build_info')?.values).toEqual([
      {
        value: 1,
        labels: {
          app: 'validator-ejector',
          version: 'fixture',
          mode: 'message',
        },
      },
    ])
    expect(metric('validator_ejector_exit_messages')?.values).toEqual([
      { value: 2, labels: { app: 'validator-ejector', valid: 'true' } },
      { value: 0, labels: { app: 'validator-ejector', valid: 'false' } },
    ])
    expect(
      metric('validator_ejector_exit_messages_left_number')?.values
    ).toEqual([{ value: 0, labels: { app: 'validator-ejector' } }])
    expect(
      metric('validator_ejector_exit_messages_left_percent')?.values
    ).toEqual([{ value: 0, labels: { app: 'validator-ejector' } }])
  })
})
