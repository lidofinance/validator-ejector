import { makeLogger } from 'lido-nanolib'
import { makeRequest } from 'lido-nanolib'

import { ethers } from 'ethers'
import { lastBlockNumberDTO, logsDTO } from './dto.js'

export type ExecutionApiService = ReturnType<typeof makeExecutionApi>

export const makeExecutionApi = (
  request: ReturnType<typeof makeRequest>,
  logger: ReturnType<typeof makeLogger>,
  {
    EXECUTION_NODE,
    CONTRACT_ADDRESS,
    OPERATOR_ID,
  }: { EXECUTION_NODE: string; CONTRACT_ADDRESS: string; OPERATOR_ID: string }
) => {
  const latestBlockNumber = async () => {
    const res = await request(EXECUTION_NODE, {
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
    const address = CONTRACT_ADDRESS
    const exitEvent = 'ValidatorExitRequest(uint256,uint256,bytes)'
    const eventTopic = ethers.utils.id(exitEvent)
    const topics = [
      eventTopic,
      null,
      ethers.utils.hexZeroPad(
        ethers.BigNumber.from(OPERATOR_ID).toHexString(),
        32
      ),
    ]
    const res = await request(EXECUTION_NODE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [
          {
            fromBlock: ethers.utils.hexlify(fromBlock),
            toBlock: ethers.utils.hexlify(toBlock),
            address,
            topics,
          },
        ],
        id: 1,
      }),
    })
    const json = await res.json()
    const { result } = logsDTO(json)

    return result.map((event) => event.data[0])
  }

  const loadExitEvents = async (toBlock: number, blocksBehind: number) => {
    const fromBlock = toBlock - blocksBehind
    return await logs(fromBlock, toBlock)
  }

  return {
    latestBlockNumber,
    logs,
    loadExitEvents,
  }
}
