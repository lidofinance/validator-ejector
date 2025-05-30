import { makeLogger } from '../../lib/index.js'

import { ethers } from 'ethers'

import { MetricsService } from '../prom/service'

import { VerifierService } from './verifier.js'
import { ValidatorsToEjectCache } from './types.js'
import { ExecutionApiService } from '../../services/execution-api/service.js'

export type ExitLogsFetcherService = ReturnType<
  typeof makeExitLogsFetcherService
>

export const makeExitLogsFetcherService = (
  logger: ReturnType<typeof makeLogger>,
  verifier: VerifierService,
  el: ExecutionApiService,
  {
    STAKING_MODULE_ID,
    DISABLE_SECURITY_DONT_USE_IN_PRODUCTION,
  }: {
    STAKING_MODULE_ID: string
    DISABLE_SECURITY_DONT_USE_IN_PRODUCTION: boolean
  },
  { eventSecurityVerification }: MetricsService
) => {
  const getVotingRequestsHashSubmittedEvents = async (
    fromBlock: number,
    toBlock: number
  ) => {
    const event = ethers.utils.Fragment.from(
      'event RequestsHashSubmitted(bytes32 exitRequestsHash)'
    )
    const iface = new ethers.utils.Interface([event])
    const eventTopic = iface.getEventTopic(event.name)

    const { result } = await el.getLogs(fromBlock, toBlock, el.exitBusAddress, [
      eventTopic,
    ])

    logger.info('Loaded RequestsHashSubmitted events', {
      amount: result.length,
    })

    const eventsMap: Record<string, string> = {}

    for (const log of result) {
      const parsed = iface.parseLog(log)
      eventsMap[parsed.args.exitRequestsHash] = log.transactionHash
    }

    return eventsMap
  }

  const getMotionCreatedEvents = async (fromBlock: number, toBlock: number) => {
    const event = ethers.utils.Fragment.from(
      'event MotionCreated(uint256 indexed _motionId, address _creator, address indexed _evmScriptFactory, bytes _evmScriptCallData, bytes _evmScript)'
    )
    const iface = new ethers.utils.Interface([event])
    const eventTopic = iface.getEventTopic(event.name)

    const { result } = await el.getLogs(
      fromBlock,
      toBlock,
      el.easyTrackAddress,
      [eventTopic]
    )

    logger.info('Loaded MotionCreated events', { amount: result.length })

    const eventsMap: Record<string, string> = {} // motion_id -> motion_create_transaction_hash

    for (const log of result) {
      const parsed = iface.parseLog(log)
      const motionId = parsed.args._motionId.toString()
      eventsMap[motionId] = log.transactionHash
    }

    return eventsMap
  }

  const getMotionEnactedEvents = async (fromBlock: number, toBlock: number) => {
    const event = ethers.utils.Fragment.from(
      'event MotionEnacted(uint256 indexed _motionId)'
    )
    const iface = new ethers.utils.Interface([event])
    const eventTopic = iface.getEventTopic(event.name)

    const { result } = await el.getLogs(
      fromBlock,
      toBlock,
      el.easyTrackAddress,
      [eventTopic]
    )

    logger.info('Loaded MotionEnacted events', { amount: result.length })

    const eventsMap: Record<string, string> = {} // motion_enact_transaction_hash -> motion_id

    for (const log of result) {
      const parsed = iface.parseLog(log)
      eventsMap[log.transactionHash] = parsed.args._motionId.toString()
    }

    return eventsMap
  }

  const getLogs = async (
    fromBlock: number,
    toBlock: number,
    operatorIds: number[]
  ) => {
    const event = ethers.utils.Fragment.from(
      'event ValidatorExitRequest(uint256 indexed stakingModuleId, uint256 indexed nodeOperatorId, uint256 indexed validatorIndex, bytes validatorPubkey, uint256 timestamp)'
    )
    const iface = new ethers.utils.Interface([event])
    const eventTopic = iface.getEventTopic(event.name)

    const { result } = await el.getLogs(fromBlock, toBlock, el.exitBusAddress, [
      eventTopic,
      ethers.utils.hexZeroPad(
        ethers.BigNumber.from(STAKING_MODULE_ID).toHexString(),
        32
      ),
      operatorIds.map((id) =>
        ethers.utils.hexZeroPad(ethers.BigNumber.from(id).toHexString(), 32)
      ),
    ])

    logger.info('Loaded ValidatorExitRequest events', {
      amount: result.length,
    })

    const votingRequestsHashSubmittedEvents =
      DISABLE_SECURITY_DONT_USE_IN_PRODUCTION
        ? {}
        : await getVotingRequestsHashSubmittedEvents(fromBlock, toBlock)

    const motionCreatedEvents = DISABLE_SECURITY_DONT_USE_IN_PRODUCTION
      ? {}
      : await getMotionCreatedEvents(fromBlock, toBlock)

    const motionEnactedEvents = DISABLE_SECURITY_DONT_USE_IN_PRODUCTION
      ? {}
      : await getMotionEnactedEvents(fromBlock, toBlock)

    const validatorsToEject: ValidatorsToEjectCache = []

    logger.info('Verifying validity of exit requests')

    for (const [index, log] of result.entries()) {
      logger.debug(
        `Processing ValidatorExitRequest events ${index + 1}/${result.length}`
      )

      const parsedLog = iface.parseLog(log)

      const { validatorIndex, validatorPubkey, nodeOperatorId } =
        parsedLog.args as unknown as {
          validatorIndex: ethers.BigNumber
          validatorPubkey: string
          nodeOperatorId: ethers.BigNumber
        }

      if (!DISABLE_SECURITY_DONT_USE_IN_PRODUCTION) {
        try {
          await verifier.verifyEvent(
            validatorPubkey,
            log.transactionHash,
            parseInt(log.blockNumber),
            votingRequestsHashSubmittedEvents,
            motionCreatedEvents,
            motionEnactedEvents
          )
          logger.debug('Event security check passed', { validatorPubkey })
          eventSecurityVerification.inc({ result: 'success' })
        } catch (e) {
          logger.error(`Event security check failed for ${validatorPubkey}`, e)
          eventSecurityVerification.inc({ result: 'error' })
          continue
        }
      } else {
        logger.warn('WARNING')
        logger.warn('Skipping protocol exit requests security checks.')
        logger.warn('Please double-check this is intentional.')
        logger.warn('WARNING')
      }

      validatorsToEject.push({
        validatorIndex: validatorIndex.toString(),
        validatorPubkey,
        blockNumber: ethers.BigNumber.from(log.blockNumber).toNumber(),
        nodeOperatorId: nodeOperatorId.toNumber(),
        acknowledged: false,
        ack() {
          this.acknowledged = true
        },
      })
    }

    return validatorsToEject
  }

  return {
    getLogs,
  }
}
