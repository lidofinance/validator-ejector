import { makeLogger } from '../../lib/index.js'
import { makeRequest } from '../../lib/index.js'

import { ethers } from 'ethers'

import { MetricsService } from '../prom/service'

import { logsDTO } from './dto.js'
import { VerifierService } from './verifier.js'

export type ExitLogsFetcherService = ReturnType<
  typeof makeExitLogsFetcherService
>

export const makeExitLogsFetcherService = (
  request: ReturnType<typeof makeRequest>,
  logger: ReturnType<typeof makeLogger>,
  verifier: VerifierService,
  {
    normalizedUrl,
    exitBusAddress,
  }: { normalizedUrl: string; exitBusAddress: string },
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
            address: exitBusAddress,
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

    const validatorsToEject: {
      validatorIndex: string
      validatorPubkey: string
    }[] = []

    logger.info('Verifying validity of exit requests')

    for (const [ix, log] of result.entries()) {
      logger.debug(`${ix + 1}/${result.length}`)

      const parsedLog = iface.parseLog(log)

      const { validatorIndex, validatorPubkey } = parsedLog.args as unknown as {
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
      })
    }

    return validatorsToEject
  }

  return {
    logs,
  }
}
