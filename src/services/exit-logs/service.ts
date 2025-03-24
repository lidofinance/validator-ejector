import { makeLogger } from '../../lib/index.js'
import { makeRequest } from '../../lib/index.js'

import { ConfigService } from 'services/config/service.js'
import { MetricsService } from '../prom/service'

import { makeVerifier } from './verifier.js'
import { ExecutionApiService } from '../execution-api/service.js'
import { makeExitLogsFetcherService } from './fetcher.js'

export type ExitLogsService = ReturnType<typeof makeExitLogsService>

export const makeExitLogsService = (
  request: ReturnType<typeof makeRequest>,
  logger: ReturnType<typeof makeLogger>,
  el: ExecutionApiService,
  {
    EXECUTION_NODE,
    STAKING_MODULE_ID,
    ORACLE_ADDRESSES_ALLOWLIST,
    DISABLE_SECURITY_DONT_USE_IN_PRODUCTION,
  }: ConfigService,
  metrics: MetricsService
) => {
  const normalizedUrl = EXECUTION_NODE.endsWith('/')
    ? EXECUTION_NODE.slice(0, -1)
    : EXECUTION_NODE

  const { exitBusAddress, consensusAddress } = el

  const verifier = makeVerifier(
    request,
    logger,
    { exitBusAddress, consensusAddress },
    { EXECUTION_NODE, STAKING_MODULE_ID, ORACLE_ADDRESSES_ALLOWLIST }
  )

  const fetcher = makeExitLogsFetcherService(
    request,
    logger,
    verifier,
    {
      normalizedUrl,
      exitBusAddress,
    },
    {
      STAKING_MODULE_ID,
      DISABLE_SECURITY_DONT_USE_IN_PRODUCTION,
    },
    metrics
  )

  return {
    fetcher,
  }
}
