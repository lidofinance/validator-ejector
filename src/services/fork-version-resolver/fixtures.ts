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
