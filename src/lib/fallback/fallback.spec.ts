import { FetchError } from 'node-fetch'
import { describe, test, expect } from 'vitest'

import { mockLogger } from '../../test/logger.js'
import { HttpException } from '../request/errors.js'
import { broadcastAll, makeFallback } from './index.js'

const URLS = [
  'http://primary.example:8545',
  'http://secondary.example:8545',
  'http://tertiary.example:8545',
]

describe('makeFallback', () => {
  test('happy path: hits the primary URL and returns its result', async () => {
    const logger = mockLogger()
    const fallback = makeFallback(URLS, logger, 'EL')

    const result = await fallback(async (url) => `ok:${url}`)

    expect(result).toBe(`ok:${URLS[0]}`)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('rotates to next URL on retryable error; every call starts at URL[0]', async () => {
    const logger = mockLogger()
    const fallback = makeFallback(URLS, logger, 'EL')

    const seen: string[] = []
    const op = async (url: string) => {
      seen.push(url)
      if (url === URLS[0]) throw new HttpException('boom', 503)
      return `ok:${url}`
    }

    expect(await fallback(op)).toBe(`ok:${URLS[1]}`)
    expect(seen).toEqual([URLS[0], URLS[1]])
    expect(logger.warn).toHaveBeenCalledWith(
      'EL endpoint failed, trying next',
      expect.objectContaining({ url: 'primary.example:8545', idx: 0 })
    )

    // Stateless: a second call also starts at URL[0] and falls through to URL[1].
    seen.length = 0
    expect(await fallback(op)).toBe(`ok:${URLS[1]}`)
    expect(seen).toEqual([URLS[0], URLS[1]])
  })

  test('terminal errors (HttpException 4xx) are not retried across endpoints', async () => {
    const logger = mockLogger()
    const fallback = makeFallback(URLS, logger, 'CL')

    const seen: string[] = []
    const op = async (url: string) => {
      seen.push(url)
      throw new HttpException('bad request', 400)
    }

    await expect(fallback(op)).rejects.toBeInstanceOf(HttpException)
    expect(seen).toEqual([URLS[0]])
  })

  test('FetchError and AbortError are retryable', async () => {
    const logger = mockLogger()
    const fallback = makeFallback(URLS, logger, 'EL')

    const seen: string[] = []
    const op = async (url: string) => {
      seen.push(url)
      if (url === URLS[0]) throw new FetchError('network down', 'system')
      if (url === URLS[1]) {
        const err = new Error('aborted')
        err.name = 'AbortError'
        throw err
      }
      return `ok:${url}`
    }

    expect(await fallback(op)).toBe(`ok:${URLS[2]}`)
    expect(seen).toEqual(URLS)
  })

  test('throws the last error when every endpoint fails', async () => {
    const logger = mockLogger()
    const fallback = makeFallback(URLS, logger, 'EL')

    const seen: string[] = []
    const op = async (url: string) => {
      seen.push(url)
      throw new HttpException(`fail:${url}`, 502)
    }

    await expect(fallback(op)).rejects.toMatchObject({
      statusCode: 502,
      response: `fail:${URLS[2]}`,
    })
    expect(seen).toEqual(URLS)
    expect(logger.warn).toHaveBeenCalledWith(
      'EL endpoint failed, all endpoints exhausted',
      expect.objectContaining({ url: 'tertiary.example:8545', idx: 2 })
    )
  })

  test('single-URL list works as a no-op pass-through', async () => {
    const logger = mockLogger()
    const fallback = makeFallback([URLS[0]], logger, 'EL')

    expect(await fallback(async (url) => `ok:${url}`)).toBe(`ok:${URLS[0]}`)

    await expect(
      fallback(async () => {
        throw new HttpException('boom', 503)
      })
    ).rejects.toBeInstanceOf(HttpException)
  })

  test('throws synchronously when constructed with an empty URL list', () => {
    const logger = mockLogger()
    expect(() => makeFallback([], logger, 'EL')).toThrow(/empty/)
  })

  test('isFallbackable boundary: HttpException 499 is terminal, 500 is retryable', async () => {
    const logger = mockLogger()
    const fallback = makeFallback(URLS, logger, 'EL')

    const seen499: string[] = []
    await expect(
      fallback(async (url) => {
        seen499.push(url)
        throw new HttpException('client', 499)
      })
    ).rejects.toBeInstanceOf(HttpException)
    expect(seen499).toEqual([URLS[0]])

    const logger2 = mockLogger()
    const fallback2 = makeFallback(URLS, logger2, 'EL')
    const seen500: string[] = []
    const result = await fallback2(async (url) => {
      seen500.push(url)
      if (url === URLS[0]) throw new HttpException('server', 500)
      return `ok:${url}`
    })
    expect(result).toBe(`ok:${URLS[1]}`)
    expect(seen500).toEqual([URLS[0], URLS[1]])
  })

  test('fallback exits in bounded time even when every URL fails', async () => {
    // Sanity check that the loop has no hidden retry amplification beyond
    // urls.length × per-op cost.
    const logger = mockLogger()
    const fallback = makeFallback(URLS, logger, 'EL')

    const op = async () => {
      throw new HttpException('boom', 503)
    }

    const startedAt = Date.now()
    await expect(fallback(op)).rejects.toBeInstanceOf(HttpException)
    expect(Date.now() - startedAt).toBeLessThan(150)
  })
})

describe('broadcastAll', () => {
  test('hits every URL and returns all results when all succeed', async () => {
    const logger = mockLogger()
    const seen: string[] = []
    const op = async (url: string) => {
      seen.push(url)
      return `ok:${url}`
    }

    const results = await broadcastAll(URLS, op, logger, 'CL')

    expect(seen.sort()).toEqual([...URLS].sort())
    expect(results.sort()).toEqual(URLS.map((u) => `ok:${u}`).sort())
    expect(logger.warn).not.toHaveBeenCalled()
    expect(logger.info).not.toHaveBeenCalled()
  })

  test('succeeds with partial failures and logs each failure', async () => {
    const logger = mockLogger()
    const op = async (url: string) => {
      if (url === URLS[0]) throw new HttpException('boom', 503)
      return `ok:${url}`
    }

    const results = await broadcastAll(URLS, op, logger, 'CL')

    expect(results).toHaveLength(2)
    expect(results.every((r) => r.startsWith('ok:'))).toBe(true)
    expect(logger.warn).toHaveBeenCalledWith(
      'CL broadcast failed at endpoint',
      expect.objectContaining({ url: 'primary.example:8545', idx: 0 })
    )
    expect(logger.info).toHaveBeenCalledWith(
      'CL broadcast partial success',
      expect.objectContaining({ ok: 2, failed: 1, total: 3 })
    )
  })

  test('throws AggregateError preserving every per-endpoint cause', async () => {
    const logger = mockLogger()
    const op = async (url: string) => {
      throw new HttpException(`fail:${url}`, 502)
    }

    let caught: unknown
    try {
      await broadcastAll(URLS, op, logger, 'CL')
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(AggregateError)
    const aggr = caught as AggregateError
    expect(aggr.message).toMatch(/broadcast failed at all 3 endpoints/)
    expect(aggr.errors).toHaveLength(3)
    expect(aggr.errors.every((e) => e instanceof HttpException)).toBe(true)
    const responses = aggr.errors.map((e) => (e as HttpException).response)
    expect(responses.sort()).toEqual(URLS.map((u) => `fail:${u}`).sort())
  })

  test('throws synchronously when constructed with an empty URL list', async () => {
    const logger = mockLogger()
    await expect(
      broadcastAll([], async () => 'never', logger, 'CL')
    ).rejects.toThrow(/empty/)
  })

  test('runs requests in parallel (not serialised)', async () => {
    const logger = mockLogger()
    const startedAt = Date.now()
    const op = async () => {
      await new Promise((r) => setTimeout(r, 50))
      return 'ok'
    }

    await broadcastAll(URLS, op, logger, 'CL')

    // Three sequential 50ms delays would be ≥150ms; parallel should be ~50ms.
    expect(Date.now() - startedAt).toBeLessThan(140)
  })
})
