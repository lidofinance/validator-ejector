import { makeLogger } from '../logger/index.js'
import { makeRequest } from '../request/index.js'
import { obj, str, arr } from '../validator/index.js'

import { ethers } from 'ethers'

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
        params: ['latest', false],
        id: 1,
      }),
    })

    const json = obj(
      await res.json(),
      'Empty response from execution node for latest block number'
    )
    const data = obj(
      json.result,
      'Empty data object from execution node for latest block number'
    )

    const result = str(data.number, 'Invalid latest block number')
    logger.debug('fetched latest block number')
    return ethers.BigNumber.from(result).toNumber()
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
        params: [{ fromBlock, toBlock, address, topics }],
        id: 1,
      }),
    })

    const json = obj(
      await res.json(),
      'Empty response from execution node for events'
    )
    const data = arr(
      json.result,
      'Empty data object from execution node for events'
    ) as { data: string[]; topics: string[] }[]

    return data.map((event) => event.data[0])
  }
  return {
    latestBlockNumber,
    logs,
  }
}
