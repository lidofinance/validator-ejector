import { ethers } from 'ethers'

import { parseExitRequests, containsExitRequest } from './verifier.js'

const DATA_FORMAT_LIST = ethers.BigNumber.from(1)
const DATA_FORMAT_LIST_WITH_KEY_INDEX = ethers.BigNumber.from(2)

const pubkeyOf = (byte: string) => `0x${byte.repeat(48)}`

// Mirrors DATA_FORMAT_LIST in ValidatorsExitBus.sol:
// moduleId(3) | nodeOpId(5) | validatorIndex(8) | pubkey(48)
const packV1 = (
  moduleId: number,
  nodeOpId: number,
  validatorIndex: number,
  pubkey: string
) =>
  ethers.utils.solidityPack(
    ['uint24', 'uint40', 'uint64', 'bytes'],
    [moduleId, nodeOpId, validatorIndex, pubkey]
  )

// Mirrors DATA_FORMAT_LIST_WITH_KEY_INDEX: keyIndex(8) before the pubkey
const packV2 = (
  moduleId: number,
  nodeOpId: number,
  validatorIndex: number,
  keyIndex: number,
  pubkey: string
) =>
  ethers.utils.solidityPack(
    ['uint24', 'uint40', 'uint64', 'uint64', 'bytes'],
    [moduleId, nodeOpId, validatorIndex, keyIndex, pubkey]
  )

const REQUEST = {
  stakingModuleId: 1,
  nodeOperatorId: 41,
  validatorIndex: 351636,
  validatorPubkey: pubkeyOf('ab'),
}

const OTHER_REQUEST = {
  stakingModuleId: 2,
  nodeOperatorId: 7,
  validatorIndex: 999999,
  validatorPubkey: pubkeyOf('cd'),
}

const v1Record = (r: typeof REQUEST) =>
  packV1(
    r.stakingModuleId,
    r.nodeOperatorId,
    r.validatorIndex,
    r.validatorPubkey
  )

const v2Record = (r: typeof REQUEST, keyIndex = 5) =>
  packV2(
    r.stakingModuleId,
    r.nodeOperatorId,
    r.validatorIndex,
    keyIndex,
    r.validatorPubkey
  )

describe('parseExitRequests', () => {
  it('decodes a single format 1 record', () => {
    const [decoded] = parseExitRequests(v1Record(REQUEST), DATA_FORMAT_LIST)

    expect(decoded.stakingModuleId.toNumber()).toBe(REQUEST.stakingModuleId)
    expect(decoded.nodeOperatorId.toNumber()).toBe(REQUEST.nodeOperatorId)
    expect(decoded.validatorIndex.toNumber()).toBe(REQUEST.validatorIndex)
    expect(decoded.validatorPubkey).toBe(REQUEST.validatorPubkey)
  })

  it('decodes every record of a multi-request format 1 data', () => {
    const data = ethers.utils.hexConcat([
      v1Record(REQUEST),
      v1Record(OTHER_REQUEST),
    ])

    const decoded = parseExitRequests(data, DATA_FORMAT_LIST)

    expect(decoded).toHaveLength(2)
    expect(decoded[0].validatorIndex.toNumber()).toBe(REQUEST.validatorIndex)
    expect(decoded[1].validatorIndex.toNumber()).toBe(
      OTHER_REQUEST.validatorIndex
    )
    expect(decoded[1].validatorPubkey).toBe(OTHER_REQUEST.validatorPubkey)
  })

  it('decodes a format 2 record, skipping the keyIndex', () => {
    const [decoded] = parseExitRequests(
      v2Record(REQUEST),
      DATA_FORMAT_LIST_WITH_KEY_INDEX
    )

    expect(decoded.stakingModuleId.toNumber()).toBe(REQUEST.stakingModuleId)
    expect(decoded.nodeOperatorId.toNumber()).toBe(REQUEST.nodeOperatorId)
    expect(decoded.validatorIndex.toNumber()).toBe(REQUEST.validatorIndex)
    expect(decoded.validatorPubkey).toBe(REQUEST.validatorPubkey)
  })

  it('decodes every record of a multi-request format 2 data', () => {
    const data = ethers.utils.hexConcat([
      v2Record(REQUEST, 0),
      v2Record(OTHER_REQUEST, 17),
    ])

    const decoded = parseExitRequests(data, DATA_FORMAT_LIST_WITH_KEY_INDEX)

    expect(decoded).toHaveLength(2)
    expect(decoded[1].validatorIndex.toNumber()).toBe(
      OTHER_REQUEST.validatorIndex
    )
    expect(decoded[1].validatorPubkey).toBe(OTHER_REQUEST.validatorPubkey)
  })

  it('throws on an unsupported data format', () => {
    for (const format of [0, 3]) {
      expect(() =>
        parseExitRequests(v1Record(REQUEST), ethers.BigNumber.from(format))
      ).toThrow(`Unsupported exit requests data format ${format}`)
    }
  })

  it('throws on empty data', () => {
    expect(() => parseExitRequests('0x', DATA_FORMAT_LIST)).toThrow(
      'Invalid exit requests data length'
    )
  })

  it('throws when the data length is not a multiple of the record length', () => {
    const truncated = ethers.utils.hexDataSlice(v1Record(REQUEST), 0, 63)
    expect(() => parseExitRequests(truncated, DATA_FORMAT_LIST)).toThrow(
      'Invalid exit requests data length'
    )

    // A format 2 record misread as format 1 leaves an 8-byte remainder
    expect(() =>
      parseExitRequests(v2Record(REQUEST), DATA_FORMAT_LIST)
    ).toThrow('Invalid exit requests data length')
  })
})

describe('containsExitRequest', () => {
  const data = ethers.utils.hexConcat([
    v1Record(REQUEST),
    v1Record(OTHER_REQUEST),
  ])

  it('finds a fully matching record in both formats', () => {
    expect(containsExitRequest(data, DATA_FORMAT_LIST, REQUEST)).toBe(true)
    expect(containsExitRequest(data, DATA_FORMAT_LIST, OTHER_REQUEST)).toBe(
      true
    )
    expect(
      containsExitRequest(
        v2Record(REQUEST),
        DATA_FORMAT_LIST_WITH_KEY_INDEX,
        REQUEST
      )
    ).toBe(true)
  })

  it('matches the pubkey case-insensitively', () => {
    const event = {
      ...REQUEST,
      validatorPubkey: REQUEST.validatorPubkey
        .toUpperCase()
        .replace('0X', '0x'),
    }
    expect(containsExitRequest(data, DATA_FORMAT_LIST, event)).toBe(true)
  })

  it('rejects a mismatch in any single field', () => {
    const mismatches = [
      { ...REQUEST, stakingModuleId: 2 },
      { ...REQUEST, nodeOperatorId: 42 },
      { ...REQUEST, validatorIndex: 351637 },
      { ...REQUEST, validatorPubkey: pubkeyOf('ee') },
    ]
    for (const event of mismatches) {
      expect(containsExitRequest(data, DATA_FORMAT_LIST, event)).toBe(false)
    }
  })

  it('rejects a cross-pairing of fields from two signed records', () => {
    const crossPaired = {
      ...REQUEST,
      validatorPubkey: OTHER_REQUEST.validatorPubkey,
    }
    expect(containsExitRequest(data, DATA_FORMAT_LIST, crossPaired)).toBe(false)
  })

  it('rejects a record that only matches across a record boundary', () => {
    // The victim's packed record appears in the byte stream, but misaligned:
    // its bytes span the tail of one signed record and the head of the next.
    const victim = OTHER_REQUEST
    const victimRecord = v1Record(victim)
    const head = ethers.utils.hexDataSlice(victimRecord, 0, 20)
    const tail = ethers.utils.hexDataSlice(victimRecord, 20)

    // Two well-formed records whose concatenation embeds victimRecord at
    // offset 44: pubkey of the first ends with its head, the second starts
    // with its tail
    const first = packV1(
      REQUEST.stakingModuleId,
      REQUEST.nodeOperatorId,
      REQUEST.validatorIndex,
      ethers.utils.hexConcat([`0x${'ab'.repeat(28)}`, head])
    )
    const second = ethers.utils.hexConcat([
      tail,
      `0x${'cd'.repeat(64 - ethers.utils.hexDataLength(tail))}`,
    ])
    const misaligned = ethers.utils.hexConcat([first, second])

    expect(ethers.utils.hexDataLength(misaligned)).toBe(128)
    expect(misaligned.includes(victimRecord.slice(2))).toBe(true)
    expect(containsExitRequest(misaligned, DATA_FORMAT_LIST, victim)).toBe(
      false
    )
  })
})
