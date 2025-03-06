import dotenv from 'dotenv'
import { makeLogger, str } from 'lido-nanolib'
import { makeRequest } from 'lido-nanolib'
import { logger as loggerMiddleware, retry, abort, prom } from 'lido-nanolib'
import { makeConfig, makeLoggerConfig } from '../services/config/service.js'
import {
  ConsensusApiService,
  makeConsensusApi,
} from '../services/consensus-api/service.js'
import { makeMetrics } from '../services/prom/service.js'

dotenv.config()

export enum Chains {
  MAINNET = 1,
  GOERLI = 5,
  HOLESKY = 17000,
}

const networks = new Map([
  [Chains.MAINNET, { name: 'mainnet', CAPELLA_FORK_VERSION: '' }],
  [Chains.GOERLI, { name: 'goerli', CAPELLA_FORK_VERSION: '' }],
  [Chains.HOLESKY, { name: 'holesky', CAPELLA_FORK_VERSION: '' }],
])

const makeCLNodesConfig = (env: NodeJS.ProcessEnv) => {
  const nodesConfig = new Map<number, string>()
  for (const [chainId] of networks.entries()) {
    nodesConfig.set(
      chainId,
      str(
        env[`CONSENSUS_NODE_CHAIN_${chainId}`],
        `Please, setup CONSENSUS_NODE_CHAIN_${chainId} address. Example: http://1.2.3.4:5051`
      )
    )
  }
  return nodesConfig
}

const makeCrossChainProvider = () => {
  const loggerConfig = makeLoggerConfig({ env: process.env })

  const logger = makeLogger({
    level: loggerConfig.LOGGER_LEVEL,
    format: loggerConfig.LOGGER_FORMAT,
    sanitizer: {
      secrets: loggerConfig.LOGGER_SECRETS,
      replacer: '<secret>',
    },
  })

  const config = makeConfig({ logger, env: process.env })

  const metrics = makeMetrics({ PREFIX: config.PROM_PREFIX })
  const clNodesConfig = makeCLNodesConfig(process.env)
  const provider = new Map<number, ConsensusApiService>()

  for (const [chainId, CONSENSUS_NODE] of clNodesConfig.entries()) {
    provider.set(
      chainId,
      makeConsensusApi(
        makeRequest([
          retry(3),
          loggerMiddleware(logger),
          prom(metrics.consensusRequestDurationSeconds),
          abort(30_000),
        ]),
        logger,
        { ...config, CONSENSUS_NODE }
      )
    )
  }

  return provider
}

const run = async () => {
  const chainsProvider = makeCrossChainProvider()

  for (const [chainId, networkData] of networks.entries()) {
    const provider = chainsProvider.get(chainId)
    if (!provider) throw new Error(`provider for chain_id ${chainId} not found`)

    const remoteChainId = await provider.chainId()

    if (!remoteChainId || chainId !== Number(remoteChainId))
      throw new Error(
        `chain id should be same for each network, check config for ${chainId} (${networkData.name}) chain`
      )

    const spec = await provider.spec()

    networkData.CAPELLA_FORK_VERSION = spec.CAPELLA_FORK_VERSION
  }

  console.log(networks.entries())
}

run().catch(console.error)
