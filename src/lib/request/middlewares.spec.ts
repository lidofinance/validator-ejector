import nock from 'nock'

import { makeRequest } from './index.js'
import {
  notOkError,
  retry,
  abort,
  prom,
  logger as loggerMiddleware,
} from './middlewares.js'

import { AbortError } from 'node-fetch'

import { makeLogger } from '../logger/index.js'

import { Registry, Histogram } from 'prom-client'

const URL = 'http://www.example.com'

describe('Fetcher Middlewares', () => {
  afterEach(() => nock.cleanAll())

  test('prom - should increment a metric and add labels on success', async () => {
    const no = nock(URL).get('/').reply(200, 'hello')

    let requestsReceived = 0
    no.on('request', () => requestsReceived++)

    const registry = new Registry()

    const histogram = new Histogram({
      name: 'histogram',
      help: 'help',
      labelNames: ['result', 'status', 'domain'], // required in middleware
      registers: [registry],
    })

    const startTimer = vi.spyOn(histogram, 'startTimer')

    const request = makeRequest([prom(histogram)])

    await request(URL)

    const metric = await registry.getSingleMetricAsString('histogram')

    expect(startTimer).toHaveBeenCalledTimes(1)

    expect(metric).toContain('result="success"')
    expect(metric).toContain('status="200"')
    expect(metric).toContain('domain="www.example.com"')

    expect(requestsReceived).toBe(1)

    registry.clear()
  })

  test('prom - should increment a metric and add labels on fail', async () => {
    const no = nock(URL).get('/').reply(500, 'oops')

    let requestsReceived = 0
    no.on('request', () => requestsReceived++)

    const registry = new Registry()

    const histogram = new Histogram({
      name: 'histogram',
      help: 'help',
      labelNames: ['result', 'status', 'domain'], // required in middleware
      registers: [registry],
    })

    const startTimer = vi.spyOn(histogram, 'startTimer')

    const request = makeRequest([prom(histogram), notOkError()])

    let err: Error | undefined
    try {
      await request(URL)
    } catch (e) {
      err = e
    }

    expect(err).toMatchInlineSnapshot('[HttpException]')

    const metric = await registry.getSingleMetricAsString('histogram')

    expect(startTimer).toHaveBeenCalledTimes(1)

    expect(metric).toContain('result="error"')
    expect(metric).toContain('status="unknown"') // not present on errors
    expect(metric).toContain('domain="www.example.com"')

    expect(requestsReceived).toBe(1)

    registry.clear()
  })

  test('logger - should log start and end of request with debug level', async () => {
    const no = nock(URL).get('/').reply(200, 'hello')

    let requestsReceived = 0
    no.on('request', () => requestsReceived++)

    const logger = makeLogger({
      level: 'debug', // middleware logs debug requests
      format: 'simple',
      silent: false,
    })

    const loggerSpied = vi.spyOn(logger, 'debug').mockImplementation(() => ({
      debug: vi.fn, // suppress stdout
    }))

    const request = makeRequest([loggerMiddleware(logger)])

    await request(URL)

    expect(loggerSpied).toHaveBeenCalledTimes(2) // before and after request was done
    expect(loggerSpied).toHaveBeenCalledWith('Start request', {
      attempt: 0,
      url: URL,
    })
    expect(loggerSpied).toHaveBeenCalledWith('End request', {
      attempt: 0,
      url: URL,
    })
    expect(requestsReceived).toBe(1)
  })

  test('notOk - should throw on bad status codes', async () => {
    const no = nock(URL).get('/').reply(500, 'oops')

    let requestsReceived = 0
    no.on('request', () => requestsReceived++)

    const request = makeRequest([notOkError()])

    let err: Error | undefined
    try {
      await request(URL)
    } catch (e) {
      err = e
    }

    expect(err).toMatchInlineSnapshot('[HttpException]')
    expect(requestsReceived).toBe(1)
  })

  test('retry - should retry 3-1=2 times', async () => {
    const no = nock(URL).get('/').times(3).reply(500, 'oops')

    let requestsReceived = 0
    no.on('request', () => requestsReceived++)

    const request = makeRequest([
      retry(3, { ignoreAbort: true, sleep: 0 }),
      notOkError(), // need a condition to repeat requests
    ])

    let err: Error | undefined
    try {
      await request(URL)
    } catch (e) {
      err = e
    }

    expect(err).toMatchInlineSnapshot('[HttpException]')

    expect(requestsReceived).toBe(3)
  })

  test('retry - should respect setting of ignoring an Abort signal', async () => {
    const no = nock(URL).get('/').delay(20).reply(200, 'hello')

    let requestsReceived = 0
    no.on('request', () => requestsReceived++)

    const request = makeRequest([
      retry(3, { ignoreAbort: false, sleep: 0 }),
      abort(10), // need a condition to repeat requests
    ])

    let err: Error | undefined
    try {
      await request(URL)
    } catch (e) {
      err = e
    }

    expect(err).toMatchInlineSnapshot(
      '[AbortError: The operation was aborted.]'
    )

    expect(requestsReceived).toBe(1)
  })

  test('abort - throw on too long responses', async () => {
    const no = nock(URL).get('/').times(4).delay(20).reply(200, 'hello')

    let requestsReceived = 0
    no.on('request', () => requestsReceived++)

    const request = makeRequest([abort(10)])

    let err: Error | undefined
    try {
      await request(URL)
    } catch (e) {
      err = e
    }

    expect(err).toEqual(new AbortError('The operation was aborted.'))
    expect(requestsReceived).toBe(1)
  })

  test('all middleware - should work together', async () => {
    const no = nock(URL).get('/').times(3).delay(20).reply(200, 'hello')

    let requestsReceived = 0
    no.on('request', () => requestsReceived++)

    const logger = makeLogger({
      level: 'debug', // middleware logs debug requests
      format: 'simple',
      silent: false,
    })

    const loggerSpied = vi
      .spyOn(logger, 'debug')
      .mockImplementation(() => ({ debug: vi.fn })) // suppress stdout

    const registry = new Registry()

    const histogram = new Histogram({
      name: 'histogram',
      help: 'help',
      labelNames: ['result', 'status', 'domain'], // required in middleware
      registers: [registry],
    })

    const startTimer = vi.spyOn(histogram, 'startTimer')

    const request = makeRequest([
      retry(3, { ignoreAbort: true, sleep: 0 }),
      loggerMiddleware(logger),
      prom(histogram),
      notOkError(),
      abort(10),
    ])

    let err: Error | undefined
    try {
      await request(URL)
    } catch (e) {
      err = e
    }

    expect(err).toMatchInlineSnapshot(
      '[AbortError: The operation was aborted.]'
    )

    const metric = await registry.getSingleMetricAsString('histogram')

    expect(startTimer).toHaveBeenCalledTimes(3)

    expect(metric).toContain('result="error"')
    expect(metric).toContain('status="unknown"')
    expect(metric).toContain('domain="www.example.com"')

    expect(loggerSpied).toHaveBeenCalledTimes(6) // before and after request was done

    // Runs:
    // 1 Run 1 Attempt with Start
    // 2 Run 1 Attempt with End
    // 3 Run 2 Attempt with Start
    // And so on
    let attempt = 1
    for (let call = 1; call <= 6; call++) {
      // Start is odd, end is even
      const isStart = call % 2 !== 0
      expect(loggerSpied).toHaveBeenNthCalledWith(
        call,
        `${isStart ? 'Start' : 'End'} request`,
        {
          attempt,
          url: URL,
        }
      )
      if (!isStart) attempt++
    }

    expect(requestsReceived).toBe(3)

    registry.clear()
  })
})
