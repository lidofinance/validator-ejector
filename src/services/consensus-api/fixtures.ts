export const nodeSyncingMock = () => ({
  url: '/eth/v1/node/syncing',
  method: 'GET',
  result: {
    data: {
      head_slot: '123',
      sync_distance: '456',
      is_syncing: true,
      is_optimistic: false,
    },
  },
})

export const genesisMock = () => ({
  url: '/eth/v1/beacon/genesis',
  method: 'GET',
  result: {
    data: {
      genesis_time: '1606824000',
      genesis_validators_root: '0x0001111',
      genesis_fork_version: '0x00000001',
    },
  },
})

export const stateMock = () => ({
  url: '/eth/v1/beacon/states/finalized/fork',
  method: 'GET',
  result: {
    data: {
      previous_version: '0x00000001',
      current_version: '0x00000002',
      epoch: '320',
    },
  },
})

export const validatorInfoMock = (id: string) => ({
  url: `/eth/v1/beacon/states/head/validators/${id}`,
  method: 'GET',
  result: {
    data: {
      index: '1',
      status: 'active',
      validator: {
        pubkey: '0x0001111',
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

export const exitRequestMock = () => ({
  url: '/eth/v1/beacon/pool/voluntary_exits',
  method: 'POST',
  result: { status: 200 },
})
