import {
  CAPELLA_MESSAGE,
  VALIDATOR_INDEX,
  VALIDATOR_PUB_KEY,
  EPOCH,
  BELLATRIX_MESSAGE,
} from './test/messages.js'
import { prepareDeps } from './test/prepare-deps.js'
import { HttpException } from '../../lib/request/errors.js'
import { genesisMock } from './test/fixtures.js'

const CAPELLA_FORK_VERSION = '0x04017000'
const BELLATRIX_FORK_VERSION = '0x03017000'
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
        previous_version: CAPELLA_FORK_VERSION,
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
    expect(di.consensusApi.fetchValidatorsInfoBatch).toHaveBeenCalledWith(
      [VALIDATOR_INDEX],
      1000
    )

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

  it('accepts the distinct previous fork before Dencun', async () => {
    const di = prepareDeps(
      [BELLATRIX_MESSAGE],
      { pubKey: VALIDATOR_PUB_KEY, id: VALIDATOR_INDEX },
      {
        previous_version: BELLATRIX_FORK_VERSION,
        current_version: CAPELLA_FORK_VERSION,
        epoch: EPOCH,
      }
    )
    try {
      const state = await di.messagesProcessor.loadToMemoryStorage(
        di.messageStorage,
        {
          isDencun: false,
          currentVersion: CAPELLA_FORK_VERSION,
          capellaVersion: CAPELLA_FORK_VERSION,
        }
      )
      expect(state.added).toBe(1)
      expect(state.invalidExitMessageFiles.size).toBe(0)
      expect(di.messageStorage.findByValidatorIndex(VALIDATOR_INDEX)).toEqual(
        JSON.parse(BELLATRIX_MESSAGE.content)
      )
    } finally {
      di.restore()
    }
  })

  it('accepts only Capella after Dencun even when the previous fork matches', async () => {
    const di = prepareDeps(
      [BELLATRIX_MESSAGE, CAPELLA_MESSAGE],
      { pubKey: VALIDATOR_PUB_KEY, id: VALIDATOR_INDEX },
      {
        previous_version: BELLATRIX_FORK_VERSION,
        current_version: DENCUN_FORK_VERSION,
        epoch: EPOCH,
      }
    )
    try {
      const state = await di.messagesProcessor.loadToMemoryStorage(
        di.messageStorage,
        {
          isDencun: true,
          currentVersion: DENCUN_FORK_VERSION,
          capellaVersion: CAPELLA_FORK_VERSION,
        }
      )
      expect(state.added).toBe(1)
      expect([...state.invalidExitMessageFiles]).toEqual(['bellatrix.json'])
      expect(di.messageStorage.findByValidatorIndex(VALIDATOR_INDEX)).toEqual(
        JSON.parse(CAPELLA_MESSAGE.content)
      )
    } finally {
      di.restore()
    }
  })

  it.each([
    ['odd hex', (signature: string) => signature.slice(0, -1)],
    ['trailing junk', (signature: string) => `${signature}junk`],
    ['infinity', () => `0xc0${'00'.repeat(95)}`],
    ['off-curve point', () => `0x80${'00'.repeat(95)}`],
    ['wrong subgroup', () => `0x80${'00'.repeat(94)}02`],
  ])('continues a batch after a signature with %s', async (_name, corrupt) => {
    const badMessage = JSON.parse(CAPELLA_MESSAGE.content)
    badMessage.signature = corrupt(badMessage.signature)
    const di = prepareDeps(
      [
        { filename: 'bad.json', content: JSON.stringify(badMessage) },
        CAPELLA_MESSAGE,
      ],
      { pubKey: VALIDATOR_PUB_KEY, id: VALIDATOR_INDEX },
      {
        previous_version: BELLATRIX_FORK_VERSION,
        current_version: CAPELLA_FORK_VERSION,
        epoch: EPOCH,
      }
    )
    try {
      const state = await di.messagesProcessor.loadToMemoryStorage(
        di.messageStorage,
        {
          isDencun: false,
          currentVersion: CAPELLA_FORK_VERSION,
          capellaVersion: CAPELLA_FORK_VERSION,
        }
      )
      expect(state.added).toBe(1)
      expect([...state.invalidExitMessageFiles]).toEqual(['bad.json'])
      expect(di.messageStorage.findByValidatorIndex(VALIDATOR_INDEX)).toEqual(
        JSON.parse(CAPELLA_MESSAGE.content)
      )
    } finally {
      di.restore()
    }
  })

  it('continues a batch after a malformed public key', async () => {
    const badMessage = JSON.parse(CAPELLA_MESSAGE.content)
    badMessage.message.validator_index = '123'
    const di = prepareDeps(
      [
        { filename: 'bad-pubkey.json', content: JSON.stringify(badMessage) },
        CAPELLA_MESSAGE,
      ],
      { pubKey: VALIDATOR_PUB_KEY, id: VALIDATOR_INDEX },
      {
        previous_version: BELLATRIX_FORK_VERSION,
        current_version: CAPELLA_FORK_VERSION,
        epoch: EPOCH,
      }
    )
    vi.mocked(di.consensusApi.fetchValidatorsInfoBatch).mockResolvedValue(
      new Map([
        [
          '123',
          { index: '123', pubKey: '0xzz', status: 'active', isExiting: false },
        ],
        [
          VALIDATOR_INDEX,
          {
            index: VALIDATOR_INDEX,
            pubKey: VALIDATOR_PUB_KEY,
            status: 'active',
            isExiting: false,
          },
        ],
      ])
    )
    try {
      const state = await di.messagesProcessor.loadToMemoryStorage(
        di.messageStorage,
        {
          isDencun: false,
          currentVersion: CAPELLA_FORK_VERSION,
          capellaVersion: CAPELLA_FORK_VERSION,
        }
      )
      expect(state.added).toBe(1)
      expect([...state.invalidExitMessageFiles]).toEqual(['bad-pubkey.json'])
      expect(di.messageStorage.findByValidatorIndex(VALIDATOR_INDEX)).toEqual(
        JSON.parse(CAPELLA_MESSAGE.content)
      )
    } finally {
      di.restore()
    }
  })

  it.each(['genesis', 'current', 'previous', 'capella'])(
    'propagates an invalid %s context length',
    async (field) => {
      const di = prepareDeps(
        [CAPELLA_MESSAGE],
        { pubKey: VALIDATOR_PUB_KEY, id: VALIDATOR_INDEX },
        {
          previous_version:
            field === 'previous' ? '0x01' : BELLATRIX_FORK_VERSION,
          current_version: field === 'current' ? '0x01' : CAPELLA_FORK_VERSION,
          epoch: EPOCH,
        }
      )
      if (field === 'genesis') {
        vi.spyOn(di.consensusApi, 'genesis').mockResolvedValue({
          ...genesisMock().result.data,
          genesis_validators_root: '0x01',
        })
      }
      try {
        await expect(
          di.messagesProcessor.loadToMemoryStorage(di.messageStorage, {
            isDencun: false,
            currentVersion: CAPELLA_FORK_VERSION,
            capellaVersion: field === 'capella' ? '0x01' : CAPELLA_FORK_VERSION,
          })
        ).rejects.toThrow(/Expected (4|32) bytes/)
        expect(di.messageStorage.size).toBe(0)
      } finally {
        di.restore()
      }
    }
  )

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
