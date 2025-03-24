import { makeLogger } from '../../lib/index.js'
import { makeRequest } from '../../lib/index.js'

import { ethers } from 'ethers'

import { ConfigService } from 'services/config/service.js'

import { logsDTO, funcDTO, txDTO } from './dto.js'

const ORACLE_FRAME_BLOCKS = 7200

export type VerifierService = ReturnType<typeof makeVerifier>

export const makeVerifier = (
  request: ReturnType<typeof makeRequest>,
  logger: ReturnType<typeof makeLogger>,
  {
    consensusAddress,
    exitBusAddress,
  }: { consensusAddress: string; exitBusAddress: string },
  {
    EXECUTION_NODE,
    STAKING_MODULE_ID,
    ORACLE_ADDRESSES_ALLOWLIST,
  }: {
    EXECUTION_NODE: string
    STAKING_MODULE_ID: string
    ORACLE_ADDRESSES_ALLOWLIST: string[]
  }
) => {
  const normalizedUrl = EXECUTION_NODE.endsWith('/')
    ? EXECUTION_NODE.slice(0, -1)
    : EXECUTION_NODE

  const getTransaction = async (transactionHash: string) => {
    const res = await request(normalizedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [transactionHash],
        id: 1,
      }),
    })

    const json = await res.json()

    const { result } = txDTO(json)

    return result
  }

  const consensusReachedTransactionHash = async (
    toBlock: number,
    refSlot: string,
    hash: string
  ) => {
    const event = ethers.utils.Fragment.from(
      'event ConsensusReached(uint256 indexed refSlot, bytes32 report, uint256 support)'
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
              ethers.BigNumber.from(toBlock - ORACLE_FRAME_BLOCKS).toHexString()
            ),
            toBlock: ethers.utils.hexStripZeros(
              ethers.BigNumber.from(toBlock).toHexString()
            ),
            address: consensusAddress,
            topics: [
              eventTopic,
              ethers.utils.hexZeroPad(
                ethers.BigNumber.from(refSlot).toHexString(),
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

    logger.debug('Loaded ConsensusReached events', { amount: result.length })

    const decoded = result.map((event) => ({
      transactionHash: event.transactionHash,
      ...iface.parseLog(event),
    }))

    const found = decoded.find((event) => event.args.report === hash)

    if (!found) throw new Error('Failed to find transaction by report hash')

    return found.transactionHash
  }

  const verifyEvent = async (
    validatorPubkey: string,
    transactionHash: string,
    toBlock: number
  ) => {
    // Final tx in which report data has been finalized
    const finalizationTx = await getTransaction(transactionHash)

    const finalizationFragment = ethers.utils.Fragment.from(
      'function submitReportData(tuple(uint256 consensusVersion, uint256 refSlot, uint256 requestsCount, uint256 dataFormat, bytes data) data, uint256 contractVersion)'
    )

    const finalizationIface = new ethers.utils.Interface([finalizationFragment])

    const finalizationDecoded = finalizationIface.decodeFunctionData(
      finalizationFragment.name,
      finalizationTx.input
    )

    const { data, refSlot, consensusVersion, requestsCount, dataFormat } =
      finalizationDecoded.data as {
        data: string
        refSlot: ethers.BigNumber
        consensusVersion: ethers.BigNumber
        requestsCount: ethers.BigNumber
        dataFormat: ethers.BigNumber
      }

    // Strip 0x
    if (!data.includes((validatorPubkey as string).slice(2)))
      throw new Error('Pubkey for exit was not found in finalized tx data')

    const encodedData = ethers.utils.defaultAbiCoder.encode(
      [
        'tuple(uint256 consensusVersion, uint256 refSlot, uint256 requestsCount, uint256 dataFormat, bytes data)',
      ],
      [[consensusVersion, refSlot, requestsCount, dataFormat, data]]
    )

    const dataHash = ethers.utils.keccak256(encodedData)

    const originTxHash = await consensusReachedTransactionHash(
      toBlock,
      refSlot.toString(),
      dataHash
    )

    const originTx = await getTransaction(originTxHash)

    const hashConsensusFragment = ethers.utils.Fragment.from(
      'function submitReport(uint256 slot, bytes32 report, uint256 consensusVersion)'
    )

    const hashConsensusIface = new ethers.utils.Interface([
      hashConsensusFragment,
    ])

    const submitReportDecoded = hashConsensusIface.decodeFunctionData(
      hashConsensusFragment.name,
      originTx.input
    )

    if (submitReportDecoded.report !== dataHash)
      throw new Error(
        'Report data hash mismatch detected between the original report and finalized event'
      )

    const expandedSig = {
      r: originTx.r,
      s: originTx.s,
      v: parseInt(originTx.v),
    }

    const sig = ethers.utils.joinSignature(expandedSig)

    const txData = {
      gasLimit: ethers.BigNumber.from(originTx.gas),
      maxFeePerGas: ethers.BigNumber.from(originTx.maxFeePerGas),
      maxPriorityFeePerGas: ethers.BigNumber.from(
        originTx.maxPriorityFeePerGas
      ),
      data: originTx.input,
      nonce: parseInt(originTx.nonce),
      to: originTx.to,
      value: ethers.BigNumber.from(originTx.value),
      type: parseInt(originTx.type),
      chainId: parseInt(originTx.chainId),
    }
    const encodedTx = ethers.utils.serializeTransaction(txData) // RLP encoded tx
    const hash = ethers.utils.keccak256(encodedTx)
    const recoveredAddress = ethers.utils.recoverAddress(hash, sig)

    // Address can be passed as checksummed or not, account for that
    const allowlist = ORACLE_ADDRESSES_ALLOWLIST.map((address) =>
      address.toLowerCase()
    )
    if (!allowlist.includes(recoveredAddress.toLowerCase())) {
      logger.error('Transaction is not signed by a trusted Oracle', {
        address: recoveredAddress,
      })
      throw new Error('Transaction is not signed by a trusted Oracle')
    }
  }

  const lastRequestedValidatorIndex = async (operatorId: number) => {
    const func = ethers.utils.Fragment.from(
      'function getLastRequestedValidatorIndices(uint256 moduleId, uint256[] nodeOpIds) view returns (int256[])'
    )
    const iface = new ethers.utils.Interface([func])
    const sig = iface.encodeFunctionData(func.name, [
      STAKING_MODULE_ID,
      [operatorId],
    ])

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

      // One last index or -1 if no exit requests have been sent yet, in BigNumber
      const decoded = iface.decodeFunctionResult(func.name, result)

      logger.debug('Fetched last requested validator exit for NO')

      const plainNumber = parseInt(decoded.toString())

      return plainNumber
    } catch (e) {
      const msg = 'Unable to retrieve last requested validator exit for NO'
      logger.error(msg, e)
      throw new Error(msg)
    }
  }

  return {
    verifyEvent,
    lastRequestedValidatorIndex,
  }
}
