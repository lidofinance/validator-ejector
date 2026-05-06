import { FetchError } from 'node-fetch'
import { HttpException } from '../request/errors.js'
import type { LoggerService } from '../logger/index.js'

export type FallbackLabel = 'EL' | 'CL'

export type FallbackRequest = <T>(op: (url: string) => Promise<T>) => Promise<T>

export const hostOf = (url: string): string => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

const isFallbackable = (err: unknown): boolean => {
  if (err instanceof HttpException) return err.statusCode >= 500
  if (err instanceof FetchError) return true
  if (err instanceof Error && err.name === 'AbortError') return true
  return false
}

/**
 * Stateless per-request fallback. Each call iterates the configured URLs in
 * order from index 0; on a retryable error (5xx / network / timeout) the
 * helper moves to the next URL. 4xx and validation errors are terminal.
 *
 * Mirrors lido-oracle's approach (`src/providers/http_provider.py`): no
 * sticky cursor, no reset interval, no per-call state — every request is
 * independent. Eliminates the cursor-race and idle-reset surprises a
 * stateful design would carry.
 */
export const makeFallback = (
  urls: string[],
  logger: LoggerService,
  label: FallbackLabel
): FallbackRequest => {
  if (urls.length === 0) {
    throw new Error(`makeFallback: ${label} urls list is empty`)
  }

  return async <T>(op: (url: string) => Promise<T>): Promise<T> => {
    let lastErr: unknown
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      try {
        return await op(url)
      } catch (err) {
        if (!isFallbackable(err)) throw err
        lastErr = err
        const isLast = i === urls.length - 1
        const msg = isLast
          ? `${label} endpoint failed, all endpoints exhausted`
          : `${label} endpoint failed, trying next`
        logger.warn(msg, { url: hostOf(url), idx: i, err })
      }
    }
    throw lastErr
  }
}

/**
 * Broadcast `op` to every URL in parallel. Succeeds if at least one
 * endpoint returns successfully; throws only if all endpoints fail.
 *
 * Use for operations whose value is "as widely propagated as possible"
 * rather than "delivered exactly once" — e.g. submitting a voluntary
 * exit to the beacon gossip network: hitting every reachable CL node
 * maximises the chance the message survives a single node going dark
 * before it propagates.
 */
export const broadcastAll = async <T>(
  urls: string[],
  op: (url: string) => Promise<T>,
  logger: LoggerService,
  label: string
): Promise<T[]> => {
  if (urls.length === 0) {
    throw new Error(`broadcastAll: ${label} urls list is empty`)
  }

  const settled = await Promise.allSettled(urls.map((url) => op(url)))
  const succeeded: T[] = []
  const failed: Array<{ url: string; idx: number; err: unknown }> = []
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') {
      succeeded.push(s.value)
    } else {
      failed.push({ url: urls[i], idx: i, err: s.reason })
    }
  })

  for (const { url, idx, err } of failed) {
    logger.warn(`${label} broadcast failed at endpoint`, {
      url: hostOf(url),
      idx,
      err,
    })
  }

  if (succeeded.length === 0) {
    // Use AggregateError so every per-endpoint failure is preserved for
    // diagnostics (Node ≥15). Mirrors lido-nestjs #95 — attaching only the
    // first cause hides the actual reason a multi-URL config didn't recover.
    const causes = failed.map(({ err }) => err)
    throw new AggregateError(
      causes,
      `${label} broadcast failed at all ${urls.length} endpoints`
    )
  }

  if (failed.length > 0) {
    logger.info(`${label} broadcast partial success`, {
      ok: succeeded.length,
      failed: failed.length,
      total: urls.length,
    })
  }

  return succeeded
}
