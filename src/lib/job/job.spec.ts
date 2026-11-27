import { Histogram, Registry } from '@prometheus-io/client'
import { mockLogger } from '../../test/logger.js'
import { makeJobRunner } from './index.js'

const makeMetric = () =>
  new Histogram({
    name: 'job_spec_duration_seconds',
    help: 'job spec',
    labelNames: ['name', 'interval', 'result'] as const,
    registers: [new Registry()],
  })

const countOf = async (metric: Histogram<string>, result: string) =>
  (await metric.get()).values.find(
    (value) =>
      value.metricName === 'job_spec_duration_seconds_count' &&
      value.labels.result === result
  )?.value

describe('job runner', () => {
  test('a failed run is a warning and the error is counted', async () => {
    const logger = mockLogger()
    const metric = makeMetric()
    const error = new Error('cycle failed')
    const job = makeJobRunner('warn-job', {
      config: { JOB_INTERVAL: 1000 },
      logger,
      metric,
      handler: async () => {
        throw error
      },
    })

    await expect(job.once({})).resolves.toBeUndefined()

    expect(logger.warn).toHaveBeenCalledWith('Job ended with error', error)
    expect(await countOf(metric, 'error')).toBe(1)
  })

  test('the initial run does not resolve silently while the lock is held', async () => {
    let release: () => void = () => undefined
    const job = makeJobRunner('locked-job', {
      config: { JOB_INTERVAL: 1000 },
      logger: mockLogger(),
      metric: makeMetric(),
      handler: () => new Promise<void>((resolve) => (release = resolve)),
    })

    const first = job.once({}, { rethrow: true })
    await expect(job.once({})).resolves.toBeUndefined()
    await expect(job.once({}, { rethrow: true })).rejects.toThrow(
      'Job locked-job is already running'
    )
    release()
    await expect(first).resolves.toBeUndefined()
  })

  test('the initial run rethrows a failure and the error is counted', async () => {
    const logger = mockLogger()
    const metric = makeMetric()
    const job = makeJobRunner('rethrow-job', {
      config: { JOB_INTERVAL: 1000 },
      logger,
      metric,
      handler: async () => {
        throw new Error('initial load failed')
      },
    })

    await expect(job.once({}, { rethrow: true })).rejects.toThrow(
      'initial load failed'
    )

    expect(logger.warn).not.toHaveBeenCalled()
    expect(await countOf(metric, 'error')).toBe(1)
    // The lock is released: the next run starts
    await expect(job.once({}, { rethrow: true })).rejects.toThrow(
      'initial load failed'
    )
    expect(await countOf(metric, 'error')).toBe(2)
  })
})
