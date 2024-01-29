import { LoggerService } from 'lido-nanolib'
import { ConsensusApiService } from 'services/consensus-api/service.js'

export type ForkVersionResolverService = ReturnType<
  typeof makeForkVersionResolver
>

export const makeForkVersionResolver = (
  consensusApi: ConsensusApiService,
  logger: LoggerService
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

    const isActivated = currentVersionNumber > capellaVersionNumber

    if (isActivated) {
      isDencunActivated = isActivated
      logger.info('Dencun fork has been activated')
    }

    return isActivated
  }

  const getCapellaForkVersion = async () => {
    const { CAPELLA_FORK_VERSION } = await consensusApi.spec()
    return CAPELLA_FORK_VERSION
  }

  const getCurrentForkVersion = async () => {
    const { current_version } = await consensusApi.state()
    return current_version
  }

  const getForkVersionMetaData = async () => {
    const currentVersion = await getCurrentForkVersion()
    const capellaVersion = await getCapellaForkVersion()

    const isDencun = await isDencunHappened(currentVersion, capellaVersion)

    return { currentVersion, capellaVersion, isDencun }
  }

  return {
    isDencunHappened,
    getCurrentForkVersion,
    getCapellaForkVersion,
    getForkVersionMetaData,
  }
}
