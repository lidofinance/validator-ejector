import { LoggerService } from 'lido-nanolib'
import { ConsensusApiService } from 'services/consensus-api/service.js'
import { CAPELLA_FORK_VERSIONS } from './constants.js'

export type ForkVersionResolverService = ReturnType<
  typeof makeForkVersionResolver
>

export const makeForkVersionResolver = (
  consensusApi: ConsensusApiService,
  logger: LoggerService,
  {
    FORCE_DENCUN_FORK_MODE,
    CAPELLA_FORK_VERSION,
  }: { FORCE_DENCUN_FORK_MODE: boolean; CAPELLA_FORK_VERSION?: string }
) => {
  let isDencunActivated = false

  const isDencunHappened = async (
    currentVersion: string,
    capellaVersion: string
  ) => {
    if (isDencunActivated) return true

    const currentVersionNumber = parseInt(currentVersion, 16)
    const capellaVersionNumber = parseInt(capellaVersion, 16)

    logger.info('Fork versions', { currentVersion, capellaVersion })

    const isActivated =
      currentVersionNumber > capellaVersionNumber || FORCE_DENCUN_FORK_MODE

    if (isActivated) {
      isDencunActivated = isActivated
      logger.info('Dencun fork has been activated')
    }

    return isActivated
  }

  const getCapellaForkVersion = async (): Promise<string> => {
    if (CAPELLA_FORK_VERSION) return CAPELLA_FORK_VERSION

    const chainId = await consensusApi.chainId()
    const capellaForkVersion = CAPELLA_FORK_VERSIONS[chainId]

    if (!capellaForkVersion) {
      throw new Error(
        `Could not find CAPELLA_FORK_VERSION for network with chain_id ${chainId}`
      )
    }

    if (!capellaForkVersion.startsWith('0x')) {
      throw new Error(
        `Invalid CAPELLA_FORK_VERSION for network with chain_id ${chainId}, should start with '0x'`
      )
    }

    return capellaForkVersion
  }

  const getCurrentForkVersion = async () => {
    const { current_version } = await consensusApi.state()
    return current_version
  }

  const getForkVersionInfo = async () => {
    const currentVersion = await getCurrentForkVersion()
    const capellaVersion = await getCapellaForkVersion()

    const isDencun = await isDencunHappened(currentVersion, capellaVersion)

    return { currentVersion, capellaVersion, isDencun }
  }

  return {
    isDencunHappened,
    getCurrentForkVersion,
    getCapellaForkVersion,
    getForkVersionInfo,
  }
}
