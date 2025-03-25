import { makeLogger } from '../../lib/index.js'
import { makeRequest } from '../../lib/index.js'

import { ethers } from 'ethers'

import { MetricsService } from '../prom/service'

import { logsDTO } from './dto.js'
import { VerifierService } from './verifier.js'
import { ValidatorsToEjectCache } from './types.js'

export type ExitLogsFetcherService = ReturnType<
  typeof makeExitLogsFetcherService
>

export const makeExitLogsFetcherService = (
  request: ReturnType<typeof makeRequest>,
  logger: ReturnType<typeof makeLogger>,
  verifier: VerifierService,
  { normalizedUrl }: { normalizedUrl: string },
  el: { exitBusAddress: string },
  {
    STAKING_MODULE_ID,
    DISABLE_SECURITY_DONT_USE_IN_PRODUCTION,
  }: {
    STAKING_MODULE_ID: string
    DISABLE_SECURITY_DONT_USE_IN_PRODUCTION: boolean
  },
  { eventSecurityVerification }: MetricsService
) => {
  const logs = async (
    fromBlock: number,
    toBlock: number,
    operatorIds: number[]
  ) => {
    const event = ethers.utils.Fragment.from(
      'event ValidatorExitRequest(uint256 indexed stakingModuleId, uint256 indexed nodeOperatorId, uint256 indexed validatorIndex, bytes validatorPubkey, uint256 timestamp)'
    )
    const iface = new ethers.utils.Interface([event])
    const eventTopic = iface.getEventTopic(event.name)

    const res = await request(normalizedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [
          {
            fromBlock: ethers.utils.hexStripZeros(
              ethers.BigNumber.from(fromBlock).toHexString()
            ),
            toBlock: ethers.utils.hexStripZeros(
              ethers.BigNumber.from(toBlock).toHexString()
            ),
            address: el.exitBusAddress,
            topics: [
              eventTopic,
              ethers.utils.hexZeroPad(
                ethers.BigNumber.from(STAKING_MODULE_ID).toHexString(),
                32
              ),
              operatorIds.map((id) =>
                ethers.utils.hexZeroPad(
                  ethers.BigNumber.from(id).toHexString(),
                  32
                )
              ),
            ],
          },
        ],
        id: 1,
      }),
    })

    const json = await res.json()

    const { result } = logsDTO(json)

    logger.info('Loaded ValidatorExitRequest events', { amount: result.length })

    const validatorsToEject: ValidatorsToEjectCache = []

    logger.info('Verifying validity of exit requests')

    const processLog = async (
      log: any,
      index: number
    ): Promise<{
      success: boolean
      data?: {
        blockNumber: number
        validatorIndex: string
        validatorPubkey: string
      }
    }> => {
      logger.debug(`Processing ${index + 1}/${result.length}`)

      try {
        const parsedLog = iface.parseLog(log)

        const { validatorIndex, validatorPubkey } =
          parsedLog.args as unknown as {
            validatorIndex: ethers.BigNumber
            validatorPubkey: string
          }

        if (!DISABLE_SECURITY_DONT_USE_IN_PRODUCTION) {
          try {
            await verifier.verifyEvent(
              validatorPubkey,
              log.transactionHash,
              parseInt(log.blockNumber)
            )
            logger.debug('Event security check passed', { validatorPubkey })
            eventSecurityVerification.inc({ result: 'success' })
          } catch (e) {
            logger.error(
              `Event security check failed for ${validatorPubkey}`,
              e
            )
            eventSecurityVerification.inc({ result: 'error' })
            return { success: false }
          }
        } else {
          logger.warn('WARNING')
          logger.warn('Skipping protocol exit requests security checks.')
          logger.warn('Please double-check this is intentional.')
          logger.warn('WARNING')
        }

        return {
          success: true,
          data: {
            blockNumber: ethers.BigNumber.from(log.blockNumber).toNumber(),
            validatorIndex: validatorIndex.toString(),
            validatorPubkey,
          },
        }
      } catch (error) {
        logger.error(`Error processing log at index ${index}`, error)
        return { success: false }
      }
    }

    const BATCH_SIZE = 10
    for (let i = 0; i < result.length; i += BATCH_SIZE) {
      const batch = result.slice(i, i + BATCH_SIZE)
      logger.info(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          result.length / BATCH_SIZE
        )}`
      )

      const batchResults = await Promise.all(
        batch.map((log, batchIndex) => processLog(log, i + batchIndex))
      )

      const validBatchResults = batchResults
        .filter((res) => res.success && res.data)
        .map((res) => res.data!)

      validatorsToEject.push(...validBatchResults)
      logger.info(
        `Completed batch with ${validBatchResults.length} valid validators`
      )
    }

    logger.info(
      `Processing complete, found ${validatorsToEject.length} valid validators to eject`
    )
    return validatorsToEject
  }

  return {
    logs,
  }
}
