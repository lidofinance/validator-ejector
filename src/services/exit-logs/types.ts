export interface ValidatorsToEject {
  stakingModuleId: number
  validatorIndex: string
  validatorPubkey: string
  blockNumber: number
  nodeOperatorId: number
  acknowledged: boolean
  ack(): void
}

export type ValidatorsToEjectCache = ValidatorsToEject[]
