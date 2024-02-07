export const stateMock = (fork: {
  previous_version: string
  current_version: string
  epoch: string
}) => ({
  url: '/eth/v1/beacon/states/finalized/fork',
  method: 'GET',
  result: {
    data: fork,
  },
})

export const depositContractMock = (chainId: string) => ({
  url: '/eth/v1/config/deposit_contract',
  method: 'GET',
  result: {
    data: {
      chain_id: chainId,
      address: '0x000000001',
    },
  },
})

export const validatorInfoMock = ({
  id,
  pubKey,
}: {
  id: string
  pubKey: string
}) => ({
  url: `/eth/v1/beacon/states/head/validators/${id}`,
  method: 'GET',
  result: {
    data: {
      index: '1',
      status: 'active',
      validator: {
        pubkey: pubKey,
        withdrawal_credentials: '0x0001111222',
        effective_balance: '32000000000',
        slashed: false,
        activation_eligibility_epoch: '0',
        activation_epoch: '0',
        exit_epoch: '18446744073709551615',
        withdrawable_epoch: '18446744073709551615',
      },
    },
  },
})

export const genesisMock = () => ({
  url: '/eth/v1/beacon/genesis',
  method: 'GET',
  result: {
    data: {
      genesis_time: '1695902400',
      genesis_validators_root:
        '0x9143aa7c615a7f7115e2b6aac319c03529df8242ae705fba9df39b79c59fa8b1',
      genesis_fork_version: '0x01017000',
    },
  },
})
