import { makeLogger } from '../../lib/index.js'
import { makeRequest } from '../../lib/index.js'

import { ethers } from 'ethers'

import { ConfigService } from '../../services/config/service.js'

import {
  syncingDTO,
  lastBlockNumberDTO,
  funcDTO,
  genericArrayOfStringsDTO,
  logsDTO,
} from './dto.js'

export type ExecutionApiService = ReturnType<typeof makeExecutionApi>

export const makeExecutionApi = (
  request: ReturnType<typeof makeRequest>,
  logger: ReturnType<typeof makeLogger>,
  { EXECUTION_NODE, LOCATOR_ADDRESS }: ConfigService
) => {
  const normalizedUrl = EXECUTION_NODE.endsWith('/')
    ? EXECUTION_NODE.slice(0, -1)
    : EXECUTION_NODE

  let exitBusAddress: string
  let consensusAddress: string

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

  const resolveExitBusAddress = async () => {
    const func = ethers.utils.Fragment.from(
      'function validatorsExitBusOracle() view returns (address)'
    )
    const iface = new ethers.utils.Interface([func])
    const sig = iface.encodeFunctionData(func.name)

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

      const decoded = iface.decodeFunctionResult(func.name, result)

      const validated = genericArrayOfStringsDTO(decoded)

      exitBusAddress = validated[0] // only returns one value

      logger.info('Resolved Exit Bus contract address using the Locator', {
        exitBusAddress,
      })
    } catch (e) {
      logger.error('Unable to resolve Exit Bus contract', e)
      throw new Error(
        'Unable to resolve Exit Bus contract address using the Locator. Please make sure LOCATOR_ADDRESS is correct.'
      )
    }
  }

  const resolveConsensusAddress = async () => {
    const func = ethers.utils.Fragment.from(
      'function getConsensusContract() view returns (address)'
    )
    const iface = new ethers.utils.Interface([func])
    const sig = iface.encodeFunctionData(func.name)

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
              to: exitBusAddress,
              data: sig,
            },
            'finalized',
          ],
          id: 1,
        }),
      })

      const json = await res.json()

      const { result } = funcDTO(json)

      const decoded = iface.decodeFunctionResult(func.name, result)

      const validated = genericArrayOfStringsDTO(decoded)

      consensusAddress = validated[0] // only returns one value

      logger.info('Resolved Consensus contract address', {
        consensusAddress,
      })
    } catch (e) {
      logger.error('Unable to resolve Consensus contract', e)
      throw new Error('Unable to resolve Consensus contract.')
    }
  }

  const logs = async (
    fromBlock: number,
    toBlock: number,
    address: string,
    topics: (string | string[])[]
  ) => {
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
            address,
            topics,
          },
        ],
        id: 1,
      }),
    })

    const json = await res.json()

    return logsDTO(json)
  }

  return {
    logs,
    get exitBusAddress() {
      if (!exitBusAddress) {
        throw new Error('Exit Bus address is not resolved yet')
      }
      return exitBusAddress
    },
    get consensusAddress() {
      if (!consensusAddress) {
        throw new Error('Consensus address is not resolved yet')
      }
      return consensusAddress
    },
    syncing,
    checkSync,
    latestBlockNumber,
    resolveExitBusAddress,
    resolveConsensusAddress,
  }
}
