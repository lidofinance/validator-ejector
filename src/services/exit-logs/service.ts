import { makeLogger } from '../../lib/index.js'

import { ConfigService } from 'services/config/service.js'
import { MetricsService } from '../prom/service'

import { makeVerifier } from './verifier.js'
import { ExecutionApiService } from '../execution-api/service.js'
import { makeExitLogsFetcherService } from './fetcher.js'
import { makeExitLogsCacheService } from './cache.js'

export type ExitLogsService = ReturnType<typeof makeExitLogsService>

const LOAD_LOGS_STEP = 10000

export const makeExitLogsService = (
  logger: ReturnType<typeof makeLogger>,
  el: ExecutionApiService,
  {
    STAKING_MODULE_ID,
    ORACLE_ADDRESSES_ALLOWLIST,
    DISABLE_SECURITY_DONT_USE_IN_PRODUCTION,
    BLOCKS_PRELOAD,
    EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST,
    SUBMIT_TX_HASH_ALLOWLIST,
  }: ConfigService,
  metrics: MetricsService
) => {
  const verifier = makeVerifier(logger, el, {
    ORACLE_ADDRESSES_ALLOWLIST,
    EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST,
    SUBMIT_TX_HASH_ALLOWLIST,
  })

  const fetcher = makeExitLogsFetcherService(
    logger,
    verifier,
    el,
    {
      STAKING_MODULE_ID,
      DISABLE_SECURITY_DONT_USE_IN_PRODUCTION,
    },
    metrics
  )

  const cache = makeExitLogsCacheService()

  const getLogs = async (operatorIds: number[], lastBlockNumber: number) => {
    const header = cache.getHeader()
    // If data is already fully cached up to the latest block, return cached data
    if (header.endBlock === lastBlockNumber) {
      logger.info(`Using cached logs up to block ${header.endBlock}`)
      return cache.getAll()
    }

    const blockFrom = Math.max(
      header.endBlock + 1,
      lastBlockNumber - BLOCKS_PRELOAD
    )

    const blockTo = lastBlockNumber

    logger.info(
      header.endBlock
        ? `Loading new logs from ${blockFrom} to ${blockTo}`
        : `Initial load from ${blockFrom} to ${blockTo}`
    )

    for (let block = blockFrom; block <= blockTo; block += LOAD_LOGS_STEP) {
      const currentBlockTo = Math.min(block + LOAD_LOGS_STEP - 1, blockTo)
      logger.info(`Fetching logs from block ${block} to ${currentBlockTo}`)

      const logs = await fetcher.getLogs(block, currentBlockTo, operatorIds)
      logs.forEach((log) => cache.push(log))

      cache.setHeader(block, currentBlockTo)
    }

    return cache.getAll()
  }

  return {
    getLogs,
    verifier,
    fetcher,
  }
}
