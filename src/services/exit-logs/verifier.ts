import { LRUCache } from 'lru-cache'
import { makeLogger } from '../../lib/index.js'

import { ethers } from 'ethers'

import { txDTO } from './dto.js'
import { ExecutionApiService } from '../../services/execution-api/service.js'

// This is the number of blocks to look back when searching for
// the ConsensusReached event. It should be more than the VEBO frame
const ORACLE_FRAME_BLOCKS = 7200
const LRU_CACHE_MAX_SIZE = 50

export type VerifierService = ReturnType<typeof makeVerifier>

export const makeVerifier = (
  logger: ReturnType<typeof makeLogger>,
  el: ExecutionApiService,
  {
    ORACLE_ADDRESSES_ALLOWLIST,
    EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST,
    SUBMIT_TX_HASH_ALLOWLIST,
  }: {
    ORACLE_ADDRESSES_ALLOWLIST: string[]
    EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST: string[]
    SUBMIT_TX_HASH_ALLOWLIST: string[]
  }
) => {
  const lruTransactionCache = new LRUCache<string, ReturnType<typeof txDTO>>({
    max: LRU_CACHE_MAX_SIZE,
  })
  const lruConsensusReachedLogsCache = new LRUCache<string, string>({
    max: LRU_CACHE_MAX_SIZE,
  })

  const getTransaction = async (transactionHash: string) => {
    const cachedResult = lruTransactionCache.get(transactionHash)
    if (cachedResult?.result) return cachedResult.result

    const json = await el.elRequest({
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [transactionHash],
        id: 1,
      }),
    })

    const { result } = txDTO(json)
    lruTransactionCache.set(result.hash, { result })
    return result
  }

  const consensusReachedTransactionHash = async (
    toBlock: number,
    refSlot: string,
    hash: string
  ) => {
    const key = `${toBlock}-${refSlot}-${hash}`
    const cachedResult = lruConsensusReachedLogsCache.get(key)
    if (cachedResult) return cachedResult

    const event = ethers.utils.Fragment.from(
      'event ConsensusReached(uint256 indexed refSlot, bytes32 report, uint256 support)'
    )
    const iface = new ethers.utils.Interface([event])
    const eventTopic = iface.getEventTopic(event.name)

    const from = toBlock - ORACLE_FRAME_BLOCKS

    const { result } = await el.getLogs(from, toBlock, el.consensusAddress, [
      eventTopic,
      ethers.utils.hexZeroPad(ethers.BigNumber.from(refSlot).toHexString(), 32),
    ])

    logger.debug('Loaded ConsensusReached events', { amount: result.length })

    const decoded = result.map((event) => ({
      transactionHash: event.transactionHash,
      ...iface.parseLog(event),
    }))

    const found = decoded.find((event) => event.args.report === hash)

    if (!found) {
      logger.error('Failed to find transaction by report hash', {
        toBlock,
        refSlot,
        hash,
      })
      throw new Error('Failed to find transaction by report hash')
    }
    lruConsensusReachedLogsCache.set(key, found.transactionHash)
    return found.transactionHash
  }

  const recoverAddress = async (tx: ReturnType<typeof txDTO>['result']) => {
    const expandedSig = {
      r: tx.r,
      s: tx.s,
      v: parseInt(tx.v),
    }
    const sig = ethers.utils.joinSignature(expandedSig)
    const txData = {
      gasLimit: ethers.BigNumber.from(tx.gas),
      maxFeePerGas: ethers.BigNumber.from(tx.maxFeePerGas),
      maxPriorityFeePerGas: ethers.BigNumber.from(tx.maxPriorityFeePerGas),
      data: tx.input,
      nonce: parseInt(tx.nonce),
      to: tx.to,
      value: ethers.BigNumber.from(tx.value),
      type: parseInt(tx.type),
      chainId: parseInt(tx.chainId),
    }
    const encodedTx = ethers.utils.serializeTransaction(txData)
    const hash = ethers.utils.keccak256(encodedTx)
    return ethers.utils.recoverAddress(hash, sig)
  }

  const verifyEvent = async (
    validatorPubkey: string,
    transactionHash: string,
    toBlock: number,
    votingRequestsHashSubmittedEvents: Record<string, string>,
    motionCreatedEvents: Record<string, string>,
    motionEnactedEvents: Record<string, string>
  ) => {
    const tx = await getTransaction(transactionHash)

    const submitReportDataFragment = ethers.utils.Fragment.from(
      'function submitReportData(tuple(uint256 consensusVersion, uint256 refSlot, uint256 requestsCount, uint256 dataFormat, bytes data) data, uint256 contractVersion)'
    )
    const submitReportDataIface = new ethers.utils.Interface([
      submitReportDataFragment,
    ])

    let isEventEmittedByOracle = true

    let decodedReportData = {} as ethers.utils.Result
    try {
      decodedReportData = submitReportDataIface.decodeFunctionData(
        submitReportDataFragment.name,
        tx.input
      )
    } catch (e) {
      isEventEmittedByOracle = false
    }

    if (isEventEmittedByOracle) {
      await verifyOracleEvent(validatorPubkey, decodedReportData, toBlock)
      return
    }

    const submitExitRequestsDataFragment = ethers.utils.Fragment.from(
      'function submitExitRequestsData(tuple(uint256 dataFormat, bytes data) request)'
    )
    const submitExitRequestsDataIface = new ethers.utils.Interface([
      submitExitRequestsDataFragment,
    ])

    let decodedExitRequestsData = {} as ethers.utils.Result
    try {
      decodedExitRequestsData = submitExitRequestsDataIface.decodeFunctionData(
        submitExitRequestsDataFragment.name,
        tx.input
      )
    } catch (e) {
      throw new Error(
        `ValidatorExitRequest was emitted by unknown contract function (tx: ${tx.hash})`,
        { cause: e }
      )
    }

    await verifyVotingEvent(
      validatorPubkey,
      decodedExitRequestsData,
      votingRequestsHashSubmittedEvents,
      motionCreatedEvents,
      motionEnactedEvents
    )
  }

  const verifyOracleEvent = async (
    validatorPubkey: string,
    decoded: ethers.utils.Result,
    toBlock: number
  ) => {
    const { data, refSlot, consensusVersion, requestsCount, dataFormat } =
      decoded.data as {
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

    if (submitReportDecoded.report !== dataHash) {
      logger.error(
        'Report data hash mismatch detected between the original report and finalized event',
        {
          finalizedHash: dataHash,
          originHash: submitReportDecoded.report,
        }
      )
      throw new Error(
        'Report data hash mismatch detected between the original report and finalized event'
      )
    }

    const recoveredAddress = await recoverAddress(originTx)

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

  const verifyVotingEvent = async (
    validatorPubkey: string,
    decoded: ethers.utils.Result,
    votingRequestsHashSubmittedEvents: Record<string, string>,
    motionCreatedEvents: Record<string, string>,
    motionEnactedEvents: Record<string, string>
  ) => {
    const { data, dataFormat } = decoded.request as {
      data: string
      dataFormat: ethers.BigNumber
    }

    if (!data.includes((validatorPubkey as string).slice(2)))
      throw new Error(
        '[verifyVotingEvent] Pubkey for exit was not found in finalized tx data'
      )

    const exitRequestsHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['bytes', 'uint256'],
        [data, dataFormat]
      )
    )

    const submitExitRequestsHashTxHash =
      votingRequestsHashSubmittedEvents[exitRequestsHash]
    if (!submitExitRequestsHashTxHash) {
      logger.error(
        '[verifyVotingEvent] No corresponding RequestsHashSubmitted event found',
        {
          exitRequestsHash: exitRequestsHash,
        }
      )
      throw new Error(
        '[verifyVotingEvent] No corresponding RequestsHashSubmitted event found'
      )
    }

    // SUBMIT_TX_HASH_ALLOWLIST is designed for use with Aragon
    // but can also be used for Easy Track in emergencies
    if (
      SUBMIT_TX_HASH_ALLOWLIST.includes(
        submitExitRequestsHashTxHash.toLowerCase()
      )
    ) {
      logger.info(
        '[verifyVotingEvent] submitExitRequestsHash transaction found in allowlist, verification passed'
      )
      return
    }

    const motionId = motionEnactedEvents[submitExitRequestsHashTxHash]
    if (!motionId) {
      logger.error(
        '[verifyVotingEvent] No corresponding MotionEnacted event found for the submitExitRequestsHash transaction',
        {
          submitExitRequestsHashTxHash: submitExitRequestsHashTxHash,
        }
      )
      throw new Error(
        '[verifyVotingEvent] No corresponding MotionEnacted event found for the submitExitRequestsHash transaction'
      )
    }

    const motionCreateTxHash = motionCreatedEvents[motionId]
    if (!motionCreateTxHash) {
      logger.error(
        '[verifyVotingEvent] No corresponding MotionCreated event found for the motion ID',
        {
          motionId: motionId,
        }
      )
      throw new Error(
        '[verifyVotingEvent] No corresponding MotionCreated event found for the motion ID'
      )
    }

    const motionCreateTx = await getTransaction(motionCreateTxHash)
    const recoveredAddress = await recoverAddress(motionCreateTx)

    const allowlist = EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST.map(
      (address) => address.toLowerCase()
    )
    if (!allowlist.includes(recoveredAddress.toLowerCase())) {
      logger.error(
        '[verifyVotingEvent] Motion creation transaction is not signed by a trusted address',
        {
          address: recoveredAddress,
        }
      )
      throw new Error(
        '[verifyVotingEvent] Motion creation transaction is not signed by a trusted address'
      )
    }
  }

  return {
    verifyEvent,
  }
}
