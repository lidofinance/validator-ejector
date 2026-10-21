import { randomBytes } from 'node:crypto'
import { PublicKey, SecretKey, Signature } from '@chainsafe/blst'
import { ssz } from '@lodestar/types'
import { utils } from 'ethers'
import {
  computeExitDomain,
  computeExitSigningRoot,
  decodeFixedHex,
  verifyExitSignature,
} from './crypto.js'
import {
  BELLATRIX_MESSAGE,
  CAPELLA_MESSAGE,
  EPOCH,
  VALIDATOR_INDEX,
  VALIDATOR_PUB_KEY,
} from './test/messages.js'

const genesisRoot = decodeFixedHex(
  '0x9143aa7c615a7f7115e2b6aac319c03529df8242ae705fba9df39b79c59fa8b1',
  32
)
const exit = { epoch: Number(EPOCH), validatorIndex: Number(VALIDATOR_INDEX) }
const capellaSignature: string = JSON.parse(CAPELLA_MESSAGE.content).signature
const capellaDomain = computeExitDomain(
  decodeFixedHex('0x04017000', 4),
  genesisRoot
)
const capellaRoot = computeExitSigningRoot(exit, capellaDomain)

describe('voluntary exit crypto', () => {
  // Independently derived with Python hashlib.sha256 and uint64 little-endian
  // chunks, without Lodestar or this adapter. Each container has two leaves:
  // ForkData = H(fork || zero[28] || genesis), VoluntaryExit = H(epochChunk ||
  // indexChunk), SigningData = H(objectRoot || domain).
  it.each([
    {
      fork: '04017000',
      domain:
        '0400000017e2dad36f1d3595152042a9ad23430197557e2e7e82bc7f7fc72972',
      signingRoot:
        '7911d422c83e58603beafc3856340aaac838f5f89fa370b78062e926161dccb0',
      signature: capellaSignature,
    },
    {
      fork: '03017000',
      domain:
        '0400000069b7d97441dbd33e5ee5b4cb8fc8b08d6a58a7274b6e6daf19ef4ca7',
      signingRoot:
        'c3318708cdb06b6a5beedc8cca1645feb2dae10c2697cde779ea6efd8d49b9f8',
      signature: JSON.parse(BELLATRIX_MESSAGE.content).signature,
    },
  ])('matches independent $fork roots and the existing signature', (vector) => {
    const domain = computeExitDomain(
      decodeFixedHex(vector.fork, 4),
      genesisRoot
    )
    const root = computeExitSigningRoot(exit, domain)

    expect(utils.hexlify(ssz.phase0.VoluntaryExit.hashTreeRoot(exit))).toBe(
      '0x60670a9a49edf36e91fd7906cb17ae86b18b13d1444af9702ecf819d25823479'
    )
    expect(utils.hexlify(domain)).toBe(`0x${vector.domain}`)
    expect(utils.hexlify(root)).toBe(`0x${vector.signingRoot}`)
    expect(verifyExitSignature(root, VALIDATOR_PUB_KEY, vector.signature)).toBe(
      true
    )
  })

  it.each([
    ['prefixless', (value: string) => value.slice(2)],
    [
      'uppercase digits',
      (value: string) => `0x${value.slice(2).toUpperCase()}`,
    ],
    ['uppercase prefix', (value: string) => value.toUpperCase()],
  ])('accepts valid %s hex', (_name, transform) => {
    expect(
      verifyExitSignature(
        capellaRoot,
        transform(VALIDATOR_PUB_KEY),
        transform(capellaSignature)
      )
    ).toBe(true)
  })

  it('rejects signatures for a different fork or genesis root', () => {
    for (const domain of [
      computeExitDomain(decodeFixedHex('03017000', 4), genesisRoot),
      computeExitDomain(decodeFixedHex('04017000', 4), new Uint8Array(32)),
    ]) {
      expect(
        verifyExitSignature(
          computeExitSigningRoot(exit, domain),
          VALIDATOR_PUB_KEY,
          capellaSignature
        )
      ).toBe(false)
    }
  })

  it.each([
    { ...exit, epoch: exit.epoch + 1 },
    { ...exit, validatorIndex: exit.validatorIndex + 1 },
  ])('rejects changes to the signed exit: %j', (changedExit) => {
    expect(
      verifyExitSignature(
        computeExitSigningRoot(changedExit, capellaDomain),
        VALIDATOR_PUB_KEY,
        capellaSignature
      )
    ).toBe(false)
  })

  it('rejects a different valid public key or signature', () => {
    const otherKey = SecretKey.fromKeygen(randomBytes(32))
    expect(
      verifyExitSignature(
        capellaRoot,
        otherKey.toPublicKey().toHex(),
        capellaSignature
      )
    ).toBe(false)
    expect(
      verifyExitSignature(
        capellaRoot,
        VALIDATOR_PUB_KEY,
        otherKey.sign(capellaRoot).toHex()
      )
    ).toBe(false)
  })

  it('does not reuse an SSZ root copied from a different exit', () => {
    const cachedExit = {
      epoch: exit.epoch,
      validatorIndex: exit.validatorIndex,
    }
    const cachedObjectRoot = ssz.phase0.VoluntaryExit.hashTreeRoot(cachedExit)
    const changedExit = { ...cachedExit, epoch: exit.epoch + 1 }
    expect(ssz.phase0.VoluntaryExit.hashTreeRoot(changedExit)).toEqual(
      cachedObjectRoot
    )
    const root = computeExitSigningRoot(changedExit, capellaDomain)
    expect(utils.hexlify(root)).toBe(
      '0xb7cc2451fa25c4f904abcb441bdbc29e0516dc668d1b4b0daab018116fcb3989'
    )
    expect(verifyExitSignature(root, VALIDATOR_PUB_KEY, capellaSignature)).toBe(
      false
    )
  })

  it.each([
    ['empty', () => ''],
    ['short', (value: string) => value.slice(0, -2)],
    ['long', (value: string) => `${value}00`],
    ['odd', (value: string) => value.slice(0, -1)],
    ['nonhex', (value: string) => `${value.slice(0, -2)}zz`],
    ['trailing junk', (value: string) => `${value}junk`],
  ])(
    'rejects %s public keys and signatures without throwing',
    (_name, corrupt) => {
      expect(
        verifyExitSignature(
          capellaRoot,
          corrupt(VALIDATOR_PUB_KEY),
          capellaSignature
        )
      ).toBe(false)
      expect(
        verifyExitSignature(
          capellaRoot,
          VALIDATOR_PUB_KEY,
          corrupt(capellaSignature)
        )
      ).toBe(false)
    }
  )

  it('rejects off-curve public keys and signatures', () => {
    // G1 x = 1 has no y on y² = x³ + 4. G2 x = (0, 0) has no y
    // on y² = x³ + (4, 4). Both have the compressed-point flag set.
    const pubkey = `0x80${'00'.repeat(46)}01`
    const signature = `0x80${'00'.repeat(95)}`
    expect(() =>
      PublicKey.fromBytes(decodeFixedHex(pubkey, 48), false)
    ).toThrow()
    expect(() =>
      Signature.fromBytes(decodeFixedHex(signature, 96), false)
    ).toThrow()
    expect(verifyExitSignature(capellaRoot, pubkey, capellaSignature)).toBe(
      false
    )
    expect(verifyExitSignature(capellaRoot, VALIDATOR_PUB_KEY, signature)).toBe(
      false
    )
  })

  it('rejects on-curve points outside the prime-order subgroups', () => {
    // G1 (0, 2) has order 3. G2 x = (2, 0) is on the twist, but outside G2.
    // BLST may reject these during deserialization itself; explicit validation
    // must also reject them. Their curve coordinates are distinct from the
    // off-curve encodings tested above.
    const pubkey = `0x80${'00'.repeat(47)}`
    const signature = `0x80${'00'.repeat(94)}02`
    expect(() => PublicKey.fromBytes(decodeFixedHex(pubkey, 48), true)).toThrow(
      /group/
    )
    expect(() =>
      Signature.fromBytes(decodeFixedHex(signature, 96), true, true)
    ).toThrow(/group/)
    expect(verifyExitSignature(capellaRoot, pubkey, capellaSignature)).toBe(
      false
    )
    expect(verifyExitSignature(capellaRoot, VALIDATOR_PUB_KEY, signature)).toBe(
      false
    )
  })

  it('rejects infinity public keys and signatures', () => {
    const pubkey = `0xc0${'00'.repeat(47)}`
    const signature = `0xc0${'00'.repeat(95)}`
    expect(verifyExitSignature(capellaRoot, pubkey, capellaSignature)).toBe(
      false
    )
    expect(verifyExitSignature(capellaRoot, VALIDATOR_PUB_KEY, signature)).toBe(
      false
    )
    expect(verifyExitSignature(capellaRoot, pubkey, signature)).toBe(false)
  })
})
