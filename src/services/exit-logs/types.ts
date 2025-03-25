export interface ValidatorsToEject {
  validatorIndex: string
  validatorPubkey: string
  blockNumber: number
  nodeOperatorId: number
  acknowledged: boolean
  ack(): void
}

export type ValidatorsToEjectCache = ValidatorsToEject[]
