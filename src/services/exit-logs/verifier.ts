import { LRUCache } from 'lru-cache'
import { makeLogger } from '../../lib/index.js'

import { ethers } from 'ethers'

import { txDTO } from './dto.js'
import { ExecutionApiService } from '../../services/execution-api/service.js'

// This is the number of blocks to look back when searching for
// the ConsensusReached event. It should be more than the VEBO frame
const ORACLE_FRAME_BLOCKS = 7200
const LRU_CACHE_MAX_SIZE = 50

// Every calldata shape the verifier can walk. The 4-byte selector of a
// transaction input is the explicit gate that picks the branch.
const submitReportDataIface = new ethers.utils.Interface([
  'function submitReportData(tuple(uint256 consensusVersion, uint256 refSlot, uint256 requestsCount, uint256 dataFormat, bytes data) data, uint256 contractVersion)',
])
const submitExitRequestsDataIface = new ethers.utils.Interface([
  'function submitExitRequestsData(tuple(bytes data, uint256 dataFormat) request)',
])
const submitReportIface = new ethers.utils.Interface([
  'function submitReport(uint256 slot, bytes32 report, uint256 consensusVersion)',
])
// EDF (LIP-37): the oracle member is a DelegationContract and its delegate
// key submits the report wrapped in execute()
const executeIface = new ethers.utils.Interface([
  'function execute(address target, bytes data)',
])

const SUBMIT_REPORT_DATA_SELECTOR =
  submitReportDataIface.getSighash('submitReportData')
const SUBMIT_EXIT_REQUESTS_DATA_SELECTOR =
  submitExitRequestsDataIface.getSighash('submitExitRequestsData')
const SUBMIT_REPORT_SELECTOR = submitReportIface.getSighash('submitReport')
const EXECUTE_SELECTOR = executeIface.getSighash('execute')

const selectorOf = (input: string) => input.slice(0, 10).toLowerCase()

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

  const prepareTransactionData = (tx: ReturnType<typeof txDTO>['result']) => {
    const isLegacyTx =
      Number(tx.type) === 0 || (!tx.maxFeePerGas && !tx.maxPriorityFeePerGas)

    if (isLegacyTx && !tx.gasPrice) {
      throw new Error(
        '[validateTransactionType] Legacy transaction missing gasPrice'
      )
    }

    const baseTxData = {
      gasLimit: ethers.BigNumber.from(tx.gas),
      data: tx.input,
      nonce: parseInt(tx.nonce),
      to: tx.to,
      value: ethers.BigNumber.from(tx.value),
      type: parseInt(tx.type),
      chainId: parseInt(tx.chainId),
    }

    return isLegacyTx
      ? { ...baseTxData, gasPrice: ethers.BigNumber.from(tx.gasPrice || '0') }
      : {
          ...baseTxData,
          maxFeePerGas: ethers.BigNumber.from(tx.maxFeePerGas || '0'),
          maxPriorityFeePerGas: ethers.BigNumber.from(
            tx.maxPriorityFeePerGas || '0'
          ),
        }
  }

  const recoverAddress = async (tx: ReturnType<typeof txDTO>['result']) => {
    const expandedSig = {
      r: tx.r,
      s: tx.s,
      v: parseInt(tx.v),
    }
    const sig = ethers.utils.joinSignature(expandedSig)

    const txData = prepareTransactionData(tx)

    const encodedTx = ethers.utils.serializeTransaction(txData)
    const hash = ethers.utils.keccak256(encodedTx)
    return ethers.utils.recoverAddress(hash, sig)
  }

  // Decodes the consensus report transaction. A pre-EDF member calls
  // submitReport itself; an EDF (LIP-37) member is a DelegationContract
  // whose delegate key wraps the same call in execute(). In both cases the
  // trusted identity is the transaction signer, checked later against the
  // allowlist.
  const decodeSubmitReport = (tx: ReturnType<typeof txDTO>['result']) => {
    switch (selectorOf(tx.input)) {
      case SUBMIT_REPORT_SELECTOR:
        return submitReportIface.decodeFunctionData('submitReport', tx.input)

      case EXECUTE_SELECTOR: {
        const executeDecoded = executeIface.decodeFunctionData(
          'execute',
          tx.input
        )
        if (
          (executeDecoded.target as string).toLowerCase() !==
          el.consensusAddress.toLowerCase()
        ) {
          throw new Error(
            `execute() in the ConsensusReached transaction targets ${executeDecoded.target} instead of the consensus contract (tx: ${tx.hash})`
          )
        }
        if (selectorOf(executeDecoded.data) !== SUBMIT_REPORT_SELECTOR) {
          throw new Error(
            `execute() in the ConsensusReached transaction wraps an unknown function (tx: ${tx.hash})`
          )
        }
        return submitReportIface.decodeFunctionData(
          'submitReport',
          executeDecoded.data
        )
      }

      default:
        throw new Error(
          `ConsensusReached transaction calls an unknown function (tx: ${tx.hash})`
        )
    }
  }

  const verifyTransactionIntegrity = (
    tx: ReturnType<typeof txDTO>['result'],
    expectedHash: string
  ) => {
    const signature = {
      v: Number(tx.v),
      r: tx.r,
      s: tx.s,
    }

    const txData = prepareTransactionData(tx)

    const serialized = ethers.utils.serializeTransaction(txData, signature)
    const computedHash = ethers.utils.keccak256(serialized)

    if (computedHash.toLowerCase() !== expectedHash.toLowerCase()) {
      logger.error(
        '[verifyTransactionIntegrity] Transaction hash mismatch detected',
        {
          computedHash,
          expectedHash,
        }
      )
      throw new Error(
        '[verifyTransactionIntegrity] Transaction hash mismatch detected'
      )
    }
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

    // EDF (LIP-37): an oracle member that is a DelegationContract submits
    // the Exit Bus report wrapped in execute(); unwrap it before gating on
    // the report function. The trust decision does not rest on this
    // transaction: verifyOracleEvent re-derives it from the consensus report
    let input = tx.input
    if (selectorOf(input) === EXECUTE_SELECTOR) {
      const executeDecoded = executeIface.decodeFunctionData('execute', input)
      if (
        (executeDecoded.target as string).toLowerCase() !==
        el.exitBusAddress.toLowerCase()
      ) {
        throw new Error(
          `execute() in the ValidatorExitRequest transaction targets ${executeDecoded.target} instead of the Exit Bus (tx: ${tx.hash})`
        )
      }
      input = executeDecoded.data
    }

    // Explicit gate: which contract function produced ValidatorExitRequest
    switch (selectorOf(input)) {
      case SUBMIT_REPORT_DATA_SELECTOR:
        // Oracle report finalized on the Exit Bus
        await verifyOracleEvent(
          validatorPubkey,
          submitReportDataIface.decodeFunctionData('submitReportData', input),
          toBlock
        )
        return

      case SUBMIT_EXIT_REQUESTS_DATA_SELECTOR:
        // Exit request placed by governance (Easy Track or Aragon)
        await verifyVotingEvent(
          validatorPubkey,
          submitExitRequestsDataIface.decodeFunctionData(
            'submitExitRequestsData',
            input
          ),
          votingRequestsHashSubmittedEvents,
          motionCreatedEvents,
          motionEnactedEvents
        )
        return

      default:
        throw new Error(
          `ValidatorExitRequest was emitted by unknown contract function (tx: ${tx.hash})`
        )
    }
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

    // Bind the transaction body to the log-derived hash before trusting any
    // of its fields (to, input, signature). Without this the delegation
    // branch would rest on an unauthenticated RPC response
    verifyTransactionIntegrity(originTx, originTxHash)

    const submitReportDecoded = decodeSubmitReport(originTx)

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

    // The signature is the only anchor a lying RPC cannot forge, so the
    // signer is checked against the allowlist for both member kinds. For an
    // EDF member the allowlist holds its delegate keys; a rotation adds the
    // new delegate and keeps the old one until its reports leave the
    // lookback window.
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
      const tx = await getTransaction(submitExitRequestsHashTxHash)
      verifyTransactionIntegrity(tx, submitExitRequestsHashTxHash)
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
