import { makeLogger } from 'lido-nanolib'
import { makeRequest } from 'lido-nanolib'

import { ethers } from 'ethers'
import { syncingDTO, lastBlockNumberDTO, logsDTO, funcDTO } from './dto.js'

export type ExecutionApiService = ReturnType<typeof makeExecutionApi>

export const makeExecutionApi = (
  request: ReturnType<typeof makeRequest>,
  logger: ReturnType<typeof makeLogger>,
  {
    EXECUTION_NODE,
    LOCATOR_ADDRESS,
    STAKING_MODULE_ID,
    OPERATOR_ID,
  }: {
    EXECUTION_NODE: string
    LOCATOR_ADDRESS: string
    STAKING_MODULE_ID: string
    OPERATOR_ID: string
  }
) => {
  const normalizedUrl = EXECUTION_NODE.endsWith('/')
    ? EXECUTION_NODE.slice(0, -1)
    : EXECUTION_NODE

  let exitBusAddress: string

  const syncing = async () => {
    const res = await request(normalizedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_syncing',
        params: [],
        id: 1,
      }),
    })
    const json = await res.json()
    const { result } = syncingDTO(json)
    logger.debug('fetched syncing status')
    return result
  }

  const checkSync = async () => {
    if (await syncing()) {
      logger.warn('Execution node is still syncing! Proceed with caution.')
    }
  }

  const latestBlockNumber = async () => {
    const res = await request(normalizedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: ['finalized', false],
        id: 1,
      }),
    })
    const json = await res.json()
    const {
      result: { number },
    } = lastBlockNumberDTO(json)
    logger.debug('fetched latest block number')
    return ethers.BigNumber.from(number).toNumber()
  }

  const logs = async (fromBlock: number, toBlock: number) => {
    const exitBusAddress = await resolveExitBusAddress()

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
              ethers.utils.hexZeroPad(
                ethers.BigNumber.from(OPERATOR_ID).toHexString(),
                32
              ),
            ],
          },
        ],
        id: 1,
      }),
    })

    const json = await res.json()

    const { result } = logsDTO(json)

    logger.info(`Loaded ${result.length} events`)

    const valsToEject = result.map((log) => {
      const parsed = iface.parseLog(log)
      return {
        validatorIndex: parsed.args['validatorIndex'] as string,
        validatorPubkey: parsed.args['validatorPubkey'] as string,
      }
    })

    return valsToEject
  }

  const resolveExitBusAddress = async () => {
    const func = ethers.utils.Fragment.from(
      'function validatorsExitBusOracle() view returns (address)'
    )
    const iface = new ethers.utils.Interface([func])
    const sig = iface.encodeFunctionData('validatorsExitBusOracle')

    try {
      const res = await request(normalizedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [
            {
              from: null,
              to: LOCATOR_ADDRESS,
              data: sig,
            },
            'finalized',
          ],
          id: 1,
        }),
      })

      const json = await res.json()

      const { result } = funcDTO(json)

      const exitBusAddress = iface.decodeFunctionResult(
        'validatorsExitBusOracle',
        result
      )[0] as string

      logger.info('Resolved Exit Bus contract address using the Locator', {
        exitBusAddress,
      })

      return exitBusAddress
    } catch (e) {
      logger.error('Unable to resolve Exit Bus contract', e)
      throw new Error(
        'Unable to resolve Exit Bus contract address using the Locator. Please make sure LOCATOR_ADDRESS is correct.'
      )
    }
  }

  return {
    syncing,
    checkSync,
    latestBlockNumber,
    logs,
    resolveExitBusAddress,
  }
}
