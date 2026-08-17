import { makeLogger } from '../../lib/index.js'

import { ethers } from 'ethers'

import { MetricsService } from '../prom/service'
import { VerifierService } from './verifier.js'

import { ValidatorsToEjectCache } from './types.js'
import { ConsensusApiService } from '../consensus-api/service.js'
import { ExecutionApiService } from '../../services/execution-api/service.js'
import type { EjectorScope } from '../config/service.js'

export type ExitLogsFetcherService = ReturnType<
  typeof makeExitLogsFetcherService
>
type ElLog = Awaited<
  ReturnType<ExecutionApiService['getLogs']>
>['result'][number]

export const makeExitLogsFetcherService = (
  logger: ReturnType<typeof makeLogger>,
  verifier: VerifierService,
  el: ExecutionApiService,
  cl: ConsensusApiService,
  {
    TRUST_MODE,
  }: {
    TRUST_MODE: boolean
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

  const getValidatorExitRequestEvents = async (
    fromBlock: number,
    toBlock: number,
    ejectorScope: EjectorScope[]
  ) => {
    const event = ethers.utils.Fragment.from(
      'event ValidatorExitRequest(uint256 indexed stakingModuleId, uint256 indexed nodeOperatorId, uint256 indexed validatorIndex, bytes validatorPubkey, uint256 timestamp)'
    )
    const iface = new ethers.utils.Interface([event])
    const eventTopic = iface.getEventTopic(event.name)
    const topic = (id: string | number) =>
      ethers.utils.hexZeroPad(ethers.BigNumber.from(id).toHexString(), 32)

    const logs: ElLog[] = []
    for (const { stakingModuleId, operatorIds } of ejectorScope) {
      const { result } = await el.getLogs(
        fromBlock,
        toBlock,
        el.exitBusAddress,
        [eventTopic, [topic(stakingModuleId)], operatorIds.map(topic)]
      )
      logs.push(...result)
    }

    logger.info('Loaded ValidatorExitRequest events', {
      amount: logs.length,
    })

    const events = logs.map((log) => {
      const parsedLog = iface.parseLog(log)
      const {
        stakingModuleId,
        validatorIndex,
        validatorPubkey,
        nodeOperatorId,
      } = parsedLog.args as unknown as {
        stakingModuleId: ethers.BigNumber
        validatorIndex: ethers.BigNumber
        validatorPubkey: string
        nodeOperatorId: ethers.BigNumber
      }

      return {
        stakingModuleId,
        validatorIndex: validatorIndex.toString(),
        validatorPubkey,
        nodeOperatorId,
        transactionHash: log.transactionHash,
        blockNumber: parseInt(log.blockNumber),
      }
    })

    const validIndices = await cl.validatePublicKeys(
      events.map((event) => ({
        validatorIndex: event.validatorIndex,
        validatorPubkey: event.validatorPubkey,
      }))
    )

    return events.filter((event) => validIndices.has(event.validatorIndex))
  }

  const getLogs = async (
    fromBlock: number,
    toBlock: number,
    ejectorScope: EjectorScope[],
    votingRequestsHashSubmittedEvents: Record<string, string> = {}
  ) => {
    const validatorExitRequestEvents = await getValidatorExitRequestEvents(
      fromBlock,
      toBlock,
      ejectorScope
    )

    const validatorsToEject: ValidatorsToEjectCache = []

    logger.info('Verifying validity of exit requests')

    for (const [index, event] of validatorExitRequestEvents.entries()) {
      logger.debug(
        `Processing ValidatorExitRequest events ${index + 1}/${
          validatorExitRequestEvents.length
        }`
      )

      const {
        stakingModuleId,
        validatorIndex,
        validatorPubkey,
        nodeOperatorId,
        transactionHash,
        blockNumber,
      } = event

      if (!TRUST_MODE) {
        try {
          await verifier.verifyEvent(
            validatorPubkey,
            transactionHash,
            blockNumber,
            votingRequestsHashSubmittedEvents
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
        validatorIndex,
        validatorPubkey,
        blockNumber: blockNumber,
        stakingModuleId: stakingModuleId.toNumber(),
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
    getVotingRequestsHashSubmittedEvents,
  }
}
