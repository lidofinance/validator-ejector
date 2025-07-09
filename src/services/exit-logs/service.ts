import { makeLogger } from '../../lib/index.js'

import { ConfigService } from 'services/config/service.js'
import { MetricsService } from '../prom/service'
import { makeVerifier } from './verifier.js'

import { ExecutionApiService } from '../execution-api/service.js'
import { ConsensusApiService } from '../consensus-api/service.js'
import { makeExitLogsFetcherService } from './fetcher.js'
import { makeExitLogsCacheService } from './cache.js'

export type ExitLogsService = ReturnType<typeof makeExitLogsService>

const LOAD_LOGS_STEP = 10000
const VOTING_EVENTS_FRAME_BLOCKS = 216000 // ~30 days

export const makeExitLogsService = (
  logger: ReturnType<typeof makeLogger>,
  el: ExecutionApiService,
  cl: ConsensusApiService,
  {
    STAKING_MODULE_ID,
    ORACLE_ADDRESSES_ALLOWLIST,
    TRUST_MODE,
    BLOCKS_PRELOAD,
    EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST,
    SUBMIT_TX_HASH_ALLOWLIST,
    EASY_TRACK_ADDRESS,
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
    cl,
    {
      STAKING_MODULE_ID,
      TRUST_MODE,
      EASY_TRACK_ADDRESS,
    },
    metrics
  )

  const cache = makeExitLogsCacheService()

  const fetchVotingEvents = async (blockFrom: number, blockTo: number) => {
    let motionCreatedEvents: Record<string, string> = {}
    let votingRequestsHashSubmittedEvents: Record<string, string> = {}
    let motionEnactedEvents: Record<string, string> = {}

    if (!TRUST_MODE) {
      const motionFromBlock = Math.max(
        0,
        blockFrom - VOTING_EVENTS_FRAME_BLOCKS
      )

      logger.info(`Loading motion events from ${motionFromBlock} to ${blockTo}`)
      for (
        let block = motionFromBlock;
        block <= blockTo;
        block += LOAD_LOGS_STEP
      ) {
        const currentBlockTo = Math.min(block + LOAD_LOGS_STEP - 1, blockTo)
        logger.info(
          `Fetching motion events from block ${block} to ${currentBlockTo}`
        )

        const batchMotionEvents = await fetcher.getMotionCreatedEvents(
          block,
          currentBlockTo
        )
        motionCreatedEvents = { ...motionCreatedEvents, ...batchMotionEvents }

        const batchVotingEvents =
          await fetcher.getVotingRequestsHashSubmittedEvents(
            block,
            currentBlockTo
          )
        votingRequestsHashSubmittedEvents = {
          ...votingRequestsHashSubmittedEvents,
          ...batchVotingEvents,
        }

        const batchMotionEnactedEvents = await fetcher.getMotionEnactedEvents(
          block,
          currentBlockTo
        )
        motionEnactedEvents = {
          ...motionEnactedEvents,
          ...batchMotionEnactedEvents,
        }
      }
    }

    return {
      motionCreatedEvents,
      votingRequestsHashSubmittedEvents,
      motionEnactedEvents,
    }
  }

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

    const {
      motionCreatedEvents,
      votingRequestsHashSubmittedEvents,
      motionEnactedEvents,
    } = await fetchVotingEvents(blockFrom, blockTo)

    for (let block = blockFrom; block <= blockTo; block += LOAD_LOGS_STEP) {
      const currentBlockTo = Math.min(block + LOAD_LOGS_STEP - 1, blockTo)
      logger.info(`Fetching logs from block ${block} to ${currentBlockTo}`)

      const logs = await fetcher.getLogs(
        block,
        currentBlockTo,
        operatorIds,
        motionCreatedEvents,
        votingRequestsHashSubmittedEvents,
        motionEnactedEvents
      )
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
