import nock from 'nock'

import { makeRequest } from './index.js'

const URL = 'http://www.example.com'

describe('Fetcher', () => {
  afterEach(() => nock.cleanAll())

  test('basic function', async () => {
    const no = nock(URL).get('/').reply(200, 'hello')

    let requestsReceived = 0
    no.on('request', () => requestsReceived++)

    const request = makeRequest([])

    const req = await request(URL)
    const res = await req.text()

    expect(requestsReceived).toBe(1)
    expect(res).toBe('hello')
  })

  test('basic function should not throw if res is not ok', async () => {
    const no = nock(URL).get('/').reply(500, 'oops')

    let requestsReceived = 0
    no.on('request', () => requestsReceived++)

    const request = makeRequest([])

    const req = await request(URL)

    expect(requestsReceived).toBe(1)
    expect(req.ok).toBe(false)
  })

  test('nock handles 3 requests', async () => {
    const no = nock(URL)
      .get('/')
      .times(3) // Have to specify how many requests to handle
      .reply(200, 'hello')

    let requestsReceived = 0
    no.on('request', () => requestsReceived++)

    const request = makeRequest([])

    await request(URL)
    await request(URL)
    await request(URL)

    expect(requestsReceived).toBe(3)
  })
})
