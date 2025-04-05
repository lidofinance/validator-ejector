import { makeLogger } from 'lido-nanolib'
import { makeRequest } from 'lido-nanolib'

import { ethers } from 'ethers'

import { ConfigService } from 'services/config/service.js'
import { MetricsService } from '../prom/service'
import { JwtService } from '../jwt/service.js'

import {
  syncingDTO,
  lastBlockNumberDTO,
  logsDTO,
  funcDTO,
  txDTO,
  genericArrayOfStringsDTO,
} from './dto.js'

const ORACLE_FRAME_BLOCKS = 7200

export type ExecutionApiService = ReturnType<typeof makeExecutionApi>

export const makeExecutionApi = (
  request: ReturnType<typeof makeRequest>,
  logger: ReturnType<typeof makeLogger>,
  {
    EXECUTION_NODE,
    LOCATOR_ADDRESS,
    STAKING_MODULE_ID,
    OPERATOR_ID,
    ORACLE_ADDRESSES_ALLOWLIST,
    DISABLE_SECURITY_DONT_USE_IN_PRODUCTION,
    JWT_SECRET_PATH,
  }: ConfigService,
  { eventSecurityVerification }: MetricsService,
  jwtService?: JwtService
) => {
  const normalizedUrl = EXECUTION_NODE.endsWith('/')
    ? EXECUTION_NODE.slice(0, -1)
    : EXECUTION_NODE

  let exitBusAddress: string
  let consensusAddress: string

  const createRequestHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    
    if (JWT_SECRET_PATH && jwtService) {
      const token = jwtService.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }
    
    return headers
  }

  const syncing = async () => {
    const res = await request(normalizedUrl, {
      method: 'POST',
      headers: createRequestHeaders(),
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
      headers: createRequestHeaders(),
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

  const getTransaction = async (transactionHash: string) => {
    const res = await request(normalizedUrl, {
      method: 'POST',
      headers: createRequestHeaders(),
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
      headers: createRequestHeaders(),
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

  const logs = async (fromBlock: number, toBlock: number) => {
    const event = ethers.utils.Fragment.from(
      'event ValidatorExitRequest(uint256 indexed stakingModuleId, uint256 indexed nodeOperatorId, uint256 indexed validatorIndex, bytes validatorPubkey, uint256 timestamp)'
    )
    const iface = new ethers.utils.Interface([event])
    const eventTopic = iface.getEventTopic(event.name)

    const res = await request(normalizedUrl, {
      method: 'POST',
      headers: createRequestHeaders(),
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
          await verifyEvent(
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

  const resolveExitBusAddress = async () => {
    const func = ethers.utils.Fragment.from(
      'function validatorsExitBusOracle() view returns (address)'
    )
    const iface = new ethers.utils.Interface([func])
    const sig = iface.encodeFunctionData(func.name)

    try {
      const res = await request(normalizedUrl, {
        method: 'POST',
        headers: createRequestHeaders(),
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
        headers: createRequestHeaders(),
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

  const lastRequestedValidatorIndex = async () => {
    const func = ethers.utils.Fragment.from(
      'function getLastRequestedValidatorIndices(uint256 moduleId, uint256[] nodeOpIds) view returns (int256[])'
    )
    const iface = new ethers.utils.Interface([func])
    const sig = iface.encodeFunctionData(func.name, [
      STAKING_MODULE_ID,
      [OPERATOR_ID],
    ])

    try {
      const res = await request(normalizedUrl, {
        method: 'POST',
        headers: createRequestHeaders(),
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
    syncing,
    checkSync,
    latestBlockNumber,
    logs,
    resolveExitBusAddress,
    resolveConsensusAddress,
    lastRequestedValidatorIndex,
  }
}

