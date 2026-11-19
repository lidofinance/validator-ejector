import { PublicKey, Signature, verify } from '@chainsafe/blst'
import { DOMAIN_VOLUNTARY_EXIT } from '@lodestar/params'
import { ssz } from '@lodestar/types'
import { utils } from 'ethers'

export const decodeFixedHex = (value: string, length: number): Uint8Array => {
  const bytes = utils.arrayify(`0x${value.replace(/^0x/i, '')}`)
  if (bytes.length !== length) {
    throw new Error(`Expected ${length} bytes, received ${bytes.length}`)
  }
  return bytes
}

export const computeExitDomain = (
  forkVersion: Uint8Array,
  genesisValidatorsRoot: Uint8Array
): Uint8Array => {
  const forkDataRoot = ssz.phase0.ForkData.hashTreeRoot({
    currentVersion: forkVersion,
    genesisValidatorsRoot,
  })
  const domain = new Uint8Array(32)
  domain.set(DOMAIN_VOLUNTARY_EXIT)
  domain.set(forkDataRoot.subarray(0, 28), 4)
  return domain
}

export const computeExitSigningRoot = (
  exit: { epoch: number; validatorIndex: number },
  domain: Uint8Array
): Uint8Array =>
  ssz.phase0.SigningData.hashTreeRoot({
    // Lodestar caches roots on input objects. Hash only these fields so an
    // object copied from an earlier exit cannot carry its cached root here.
    objectRoot: ssz.phase0.VoluntaryExit.hashTreeRoot({
      epoch: exit.epoch,
      validatorIndex: exit.validatorIndex,
    }),
    domain,
  })

export const verifyExitSignature = (
  signingRoot: Uint8Array,
  publicKey: string,
  signature: string
): boolean => {
  try {
    const pubkey = PublicKey.fromBytes(decodeFixedHex(publicKey, 48), true)
    const sig = Signature.fromBytes(decodeFixedHex(signature, 96), true, true)
    return verify(signingRoot, pubkey, sig, true, true)
  } catch {
    // Malformed local messages must not prevent validation of the next file.
    return false
  }
}
