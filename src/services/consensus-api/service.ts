import {
  broadcastAll,
  makeFallback,
  makeLogger,
  makeRequest,
  notOkError,
  safelyParseJsonResponse,
} from '../../lib/index.js'
import { RequestConfig } from '../../lib/request/types.js'
import {
  syncingDTO,
  genesisDTO,
  stateDTO,
  validatorInfoDTO,
  specDTO,
  depositContractDTO,
  validatorsBatchDTO,
} from './dto.js'

export const FAR_FUTURE_EPOCH = String(2n ** 64n - 1n)

export type ConsensusApiService = ReturnType<typeof makeConsensusApi>

export const makeConsensusApi = (
  request: ReturnType<typeof makeRequest>,
  logger: ReturnType<typeof makeLogger>,
  { CONSENSUS_NODE }: { CONSENSUS_NODE: string[] }
) => {
  const fallback = makeFallback(CONSENSUS_NODE, logger, 'CL')

  const clRequest = (path: string, cfg?: RequestConfig) =>
    fallback((url) => request(`${url}${path}`, cfg))

  const isValidatorExiting = (exitEpoch: string) =>
    exitEpoch !== FAR_FUTURE_EPOCH

  const syncing = async () => {
    const res = await clRequest('/eth/v1/node/syncing', {
      middlewares: [notOkError()],
    })
    const { data } = syncingDTO(await safelyParseJsonResponse(res, logger))
    logger.debug('fetched syncing status')
    return data.is_syncing
  }

  const checkSync = async () => {
    if (await syncing()) {
      logger.warn('Consensus node is still syncing! Proceed with caution.')
    }
  }

  const genesis = async () => {
    const res = await clRequest('/eth/v1/beacon/genesis', {
      middlewares: [notOkError()],
    })
    const { data } = genesisDTO(await safelyParseJsonResponse(res, logger))
    logger.debug('fetched genesis data')
    return data
  }

  const state = async () => {
    const res = await clRequest('/eth/v1/beacon/states/finalized/fork', {
      middlewares: [notOkError()],
    })
    const { data } = stateDTO(await safelyParseJsonResponse(res, logger))
    logger.debug('fetched state data')
    return data
  }

  const spec = async () => {
    const res = await clRequest('/eth/v1/config/spec', {
      middlewares: [notOkError()],
    })
    const { data } = specDTO(await safelyParseJsonResponse(res, logger))
    logger.debug('fetched spec data')
    return data
  }

  const validatorInfo = async (
    id: string,
    tag: 'head' | 'finalized' = 'head'
  ) => {
    const res = await clRequest(
      `/eth/v1/beacon/states/${tag}/validators/${id}`,
      { middlewares: [notOkError()] }
    )

    const result = validatorInfoDTO(await safelyParseJsonResponse(res, logger))

    const { index, validator, status } = result.data
    const pubKey = validator.pubkey

    const isExiting = isValidatorExiting(validator.exit_epoch)

    logger.debug('Validator info', { index, pubKey, status, isExiting })

    return { index, pubKey, status, isExiting }
  }

  const exitRequest = async (message: {
    message: {
      epoch: string
      validator_index: string
    }
    signature: string
  }) => {
    // Voluntary exits are broadcast to *every* configured CL endpoint in
    // parallel so the message reaches gossip via the widest possible path.
    // Succeeds if any one endpoint accepts; throws only if all reject.
    await broadcastAll(
      CONSENSUS_NODE,
      (url) =>
        request(`${url}/eth/v1/beacon/pool/voluntary_exits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
          middlewares: [notOkError()],
        }),
      logger,
      'CL'
    )
  }

  const depositContract = async () => {
    const res = await clRequest('/eth/v1/config/deposit_contract', {
      middlewares: [notOkError()],
    })
    const { data } = depositContractDTO(await res.json())
    logger.debug('fetched deposit contract data')
    return data
  }

  const chainId = async () => {
    return (await depositContract()).chain_id
  }

  const fetchValidatorsBatch = async (
    indices: string[],
    batchSize = 1000,
    state: string | number = 'head'
  ) => {
    const allValidators: ReturnType<typeof validatorsBatchDTO>['data'] = []
    for (let i = 0; i < indices.length; i += batchSize) {
      const batch = indices.slice(i, i + batchSize)
      const path = `/eth/v1/beacon/states/${state}/validators?id=${batch.join(
        ','
      )}`
      const res = await clRequest(path, { middlewares: [notOkError()] })
      const json = await safelyParseJsonResponse(res, logger)
      const { data } = validatorsBatchDTO(json)
      allValidators.push(...data)
    }
    return allValidators
  }

  const getExitingValidatorsCount = async (
    indices: string[],
    batchSize = 1000,
    state: string | number = 'head'
  ) => {
    const validators = await fetchValidatorsBatch(indices, batchSize, state)
    return validators.filter(
      (v) =>
        v.validator?.exit_epoch && isValidatorExiting(v.validator.exit_epoch)
    ).length
  }

  const fetchValidatorsInfoBatch = async (
    indices: string[],
    batchSize = 1000,
    tag: 'head' | 'finalized' = 'head'
  ) => {
    const validators = await fetchValidatorsBatch(indices, batchSize, tag)

    const result = new Map<
      string,
      { index: string; pubKey: string; status: string; isExiting: boolean }
    >()

    for (const v of validators) {
      result.set(v.index, {
        index: v.index,
        pubKey: v.validator.pubkey,
        status: v.status,
        isExiting: isValidatorExiting(v.validator.exit_epoch),
      })
    }

    logger.debug(`Fetched info for ${result.size} validators in batch`)

    return result
  }

  const validatePublicKeys = async (
    validatorData: Array<{ validatorIndex: string; validatorPubkey: string }>,
    batchSize = 1000,
    state: string | number = 'head'
  ) => {
    const validIndices = new Set<string>()
    const indices = validatorData.map((v) => v.validatorIndex)

    const validators = await fetchValidatorsBatch(indices, batchSize, state)

    const validatorRecord: Record<string, string> = Object.fromEntries(
      validators.map((v) => [v.index, v.validator.pubkey])
    )

    for (const validatorInfo of validatorData) {
      const expectedPubkey = validatorRecord[validatorInfo.validatorIndex]

      if (!expectedPubkey) {
        logger.warn('Validator not found in consensus layer', {
          validatorIndex: validatorInfo.validatorIndex,
          validatorPubkey: validatorInfo.validatorPubkey,
        })
        continue
      }

      if (expectedPubkey !== validatorInfo.validatorPubkey) {
        logger.warn('Public key mismatch detected', {
          validatorIndex: validatorInfo.validatorIndex,
          expectedPubkey,
          eventPubkey: validatorInfo.validatorPubkey,
        })
        continue
      }

      validIndices.add(validatorInfo.validatorIndex)
    }

    logger.info('Public key validation completed', {
      totalValidators: validatorData.length,
      validValidators: validIndices.size,
      invalidValidators: validatorData.length - validIndices.size,
    })

    return validIndices
  }

  return {
    syncing,
    checkSync,
    genesis,
    state,
    validatorInfo,
    exitRequest,
    spec,
    depositContract,
    chainId,
    getExitingValidatorsCount,
    validatePublicKeys,
    fetchValidatorsBatch,
    fetchValidatorsInfoBatch,
    isValidatorExiting,
  }
}
