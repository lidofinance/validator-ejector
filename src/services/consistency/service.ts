import {
  hostOf,
  iterateAll,
  notOkError,
  safelyParseJsonResponse,
  type LoggerService,
  type RequestService,
} from '../../lib/index.js'
import type { ConfigService } from '../config/service.js'

export type ConsistencyChecker = ReturnType<typeof makeConsistencyChecker>

/**
 * Cross-endpoint chain-id consistency check, run once at startup.
 *
 * Issues `eth_chainId` to every EXECUTION_NODE URL and reads
 * `data.chain_id` from `/eth/v1/config/deposit_contract` on every
 * CONSENSUS_NODE URL, then verifies that:
 *   - all EL URLs report the same chain id;
 *   - all CL URLs report the same chain id;
 *   - the EL chain id matches the CL chain id.
 *
 * Uses `iterateAll` rather than the fallback wrapper: the whole point is
 * to detect divergence, so each endpoint must be queried directly. Any
 * per-endpoint failure (network error, HTTP 5xx, malformed body, etc.)
 * is treated as fatal — better to refuse boot than silently skip the
 * check.
 */
export const makeConsistencyChecker = (
  request: RequestService,
  logger: LoggerService,
  {
    EXECUTION_NODE,
    CONSENSUS_NODE,
  }: Pick<ConfigService, 'EXECUTION_NODE' | 'CONSENSUS_NODE'>
) => {
  const fetchElChainId = async (url: string): Promise<number> => {
    const res = await request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1,
      }),
      middlewares: [notOkError()],
    })
    const json = await safelyParseJsonResponse(res, logger)
    const result = (json as { result?: string } | null)?.result
    if (typeof result !== 'string') {
      throw new Error(
        `EL ${hostOf(url)}: missing 'result' in eth_chainId response`
      )
    }
    return parseInt(result, 16)
  }

  const fetchClChainId = async (url: string): Promise<number> => {
    const res = await request(`${url}/eth/v1/config/deposit_contract`, {
      middlewares: [notOkError()],
    })
    const json = await safelyParseJsonResponse(res, logger)
    const chainId = (json as { data?: { chain_id?: string } } | null)?.data
      ?.chain_id
    if (typeof chainId !== 'string') {
      throw new Error(
        `CL ${hostOf(
          url
        )}: missing 'data.chain_id' in deposit_contract response`
      )
    }
    return parseInt(chainId, 10)
  }

  const collect = async (
    label: 'EL' | 'CL',
    urls: string[],
    fetcher: (url: string) => Promise<number>
  ): Promise<number[]> => {
    const results = await iterateAll(urls, fetcher)
    const failed = results.filter(
      (r): r is Extract<typeof r, { err: unknown }> => 'err' in r
    )
    if (failed.length > 0) {
      for (const f of failed) {
        logger.error(`${label} chain-id check failed`, {
          idx: f.idx,
          url: hostOf(f.url),
          err: f.err,
        })
      }
      throw new Error(
        `${label} chain-id check failed for ${failed.length} of ${urls.length} endpoints`
      )
    }
    const chainIds = results.map(
      (r) => (r as Extract<typeof r, { value: number }>).value
    )
    const distinct = new Set(chainIds)
    if (distinct.size > 1) {
      const detail = chainIds.map((id, i) => ({
        idx: i,
        url: hostOf(urls[i]),
        chainId: id,
      }))
      logger.error(`${label} endpoints report different chain ids`, { detail })
      throw new Error(
        `${label} endpoints report different chain ids: ${JSON.stringify(
          detail
        )}`
      )
    }
    return chainIds
  }

  const checkChainIds = async (): Promise<{ chainId: number }> => {
    const elIds = await collect('EL', EXECUTION_NODE, fetchElChainId)
    const clIds = await collect('CL', CONSENSUS_NODE, fetchClChainId)
    const elId = elIds[0]
    const clId = clIds[0]
    if (elId !== clId) {
      logger.error('EL and CL endpoints report different chain ids', {
        elChainId: elId,
        clChainId: clId,
      })
      throw new Error(
        `EL chain id (${elId}) does not match CL chain id (${clId})`
      )
    }
    logger.info('Chain-id consistency check passed', {
      chainId: elId,
      elEndpoints: EXECUTION_NODE.length,
      clEndpoints: CONSENSUS_NODE.length,
    })
    return { chainId: elId }
  }

  return { checkChainIds }
}
