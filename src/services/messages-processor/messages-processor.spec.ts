import {
  CAPELLA_MESSAGE,
  VALIDATOR_INDEX,
  VALIDATOR_PUB_KEY,
  EPOCH,
  BELLATRIX_MESSAGE,
} from './test/messages.js'
import { prepareDeps } from './test/prepare-deps.js'
import { HttpException } from '../../lib/request/errors.js'

const CAPELLA_FORK_VERSION = '0x04017000'
const BELLATRIX_FORK_VERSION = '0x04017000'
const DENCUN_FORK_VERSION = '0x05017000'

describe('messages processor', () => {
  it('capella fork resolve', async () => {
    const di = prepareDeps(
      [CAPELLA_MESSAGE, BELLATRIX_MESSAGE],
      {
        pubKey: VALIDATOR_PUB_KEY,
        id: VALIDATOR_INDEX,
      },
      {
        previous_version: BELLATRIX_FORK_VERSION,
        current_version: CAPELLA_FORK_VERSION,
        epoch: EPOCH,
      }
    )

    const { isDencun, capellaVersion, currentVersion } =
      await di.forkVersionResolver.getForkVersionInfo()

    expect(isDencun).toBeFalsy()
    expect(capellaVersion).toBe(CAPELLA_FORK_VERSION)
    expect(currentVersion).toBe(CAPELLA_FORK_VERSION)

    const state = await di.messagesProcessor.loadToMemoryStorage(
      di.messageStorage,
      {
        isDencun,
        capellaVersion,
        currentVersion,
      }
    )

    const invalidFiles = Array.from(state.invalidExitMessageFiles)

    expect(state.added).toBe(1)
    expect(invalidFiles).toHaveLength(1)
    expect(invalidFiles[0]).toBe('bellatrix.json')
    expect(
      di.messageStorage.messagesMetadata.get(VALIDATOR_INDEX)?.meta.forkVersion
    ).toBe(CAPELLA_FORK_VERSION)

    di.changeForkState({
      previous_version: CAPELLA_FORK_VERSION,
      current_version: DENCUN_FORK_VERSION,
      epoch: EPOCH,
    })

    const newForkVersionInfo = await di.forkVersionResolver.getForkVersionInfo()

    expect(newForkVersionInfo.isDencun).toBeTruthy()
    expect(newForkVersionInfo.capellaVersion).toBe(CAPELLA_FORK_VERSION)
    expect(newForkVersionInfo.currentVersion).toBe(DENCUN_FORK_VERSION)

    const newState = await di.messagesProcessor.loadToMemoryStorage(
      di.messageStorage,
      newForkVersionInfo
    )

    const newInvalidFiles = Array.from(newState.invalidExitMessageFiles)

    expect(newState.added).toBe(1)
    expect(newInvalidFiles).toHaveLength(1)
    expect(newInvalidFiles[0]).toBe('bellatrix.json')
    expect(
      di.messageStorage.messagesMetadata.get(VALIDATOR_INDEX)?.meta.forkVersion
    ).toBe(DENCUN_FORK_VERSION)

    di.restore()
  })

  it('dencun fork resolve', async () => {
    const di = prepareDeps(
      [CAPELLA_MESSAGE],
      {
        pubKey: VALIDATOR_PUB_KEY,
        id: VALIDATOR_INDEX,
      },
      {
        previous_version: CAPELLA_FORK_VERSION,
        current_version: DENCUN_FORK_VERSION,
        epoch: EPOCH,
      }
    )

    const { isDencun, capellaVersion, currentVersion } =
      await di.forkVersionResolver.getForkVersionInfo()

    expect(isDencun).toBeTruthy()
    expect(capellaVersion).toBe(CAPELLA_FORK_VERSION)
    expect(currentVersion).toBe(DENCUN_FORK_VERSION)

    di.restore()
  })

  it('logs exit request failures as error objects', async () => {
    const di = prepareDeps(
      [CAPELLA_MESSAGE],
      {
        pubKey: VALIDATOR_PUB_KEY,
        id: VALIDATOR_INDEX,
      },
      {
        previous_version: BELLATRIX_FORK_VERSION,
        current_version: CAPELLA_FORK_VERSION,
        epoch: EPOCH,
      }
    )
    const error = new AggregateError(
      [new HttpException('primary rejected exit', 400)],
      'CL broadcast failed at all 1 endpoints'
    )
    const loggerErrorSpy = vi
      .spyOn(di.errorLogger, 'error')
      .mockImplementation(() => undefined)
    vi.spyOn(di.consensusApi, 'exitRequest').mockRejectedValue(error)
    di.messageStorage.updateMessages([
      {
        data: JSON.parse(CAPELLA_MESSAGE.content),
        meta: {
          fileChecksum: 'checksum',
          filename: CAPELLA_MESSAGE.filename,
          forkVersion: CAPELLA_FORK_VERSION,
        },
      },
    ])

    await di.messagesProcessor.exit(di.messageStorage, {
      validatorPubkey: VALIDATOR_PUB_KEY,
      validatorIndex: VALIDATOR_INDEX,
    })

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Failed to send out exit message',
      error
    )

    di.restore()
  })

  it('propagates batch validator info failures', async () => {
    const di = prepareDeps(
      [CAPELLA_MESSAGE],
      {
        pubKey: VALIDATOR_PUB_KEY,
        id: VALIDATOR_INDEX,
      },
      {
        previous_version: BELLATRIX_FORK_VERSION,
        current_version: CAPELLA_FORK_VERSION,
        epoch: EPOCH,
      },
      { failValidatorsBatch: true }
    )

    await expect(
      di.messagesProcessor.loadToMemoryStorage(di.messageStorage, {
        isDencun: false,
        capellaVersion: CAPELLA_FORK_VERSION,
        currentVersion: CAPELLA_FORK_VERSION,
      })
    ).rejects.toThrow()

    di.restore()
  })
})
