export const syncingMock = () => ({
  url: '/',
  method: 'POST',
  result: {
    result: true,
  },
  body: { jsonrpc: '2.0', method: 'eth_syncing', params: [], id: 1 },
})

export const lastBlockNumberMock = () => ({
  url: '/',
  method: 'GET',
  result: {
    result: {
      number: '456',
    },
  },
  body: {
    jsonrpc: '2.0',
    method: 'eth_getBlockByNumber',
    params: ['finalized', false],
    id: 1,
  },
})

export const logsMock = () => ({
  url: '/',
  method: 'GET',
  result: {
    result: [
      {
        topics: ['0x0001111', '0x0001112'],
        data: '0x0001113',
        blockNumber: '123',
        transactionHash: '0x0001114',
      },
      // more objects as needed
    ],
  },
})

export const funcMock = () => ({
  url: '/eth/v1/func',
  method: 'GET',
  result: {
    result: '0x0001111',
  },
})

export const txMock = () => ({
  url: '/eth/v1/tx',
  method: 'GET',
  result: {
    result: {
      from: '0x0001111',
      gas: '21000',
      gasPrice: '20000000000',
      maxFeePerGas: '1',
      maxPriorityFeePerGas: '1',
      hash: '0x0001112',
      input: '0x0001113',
      nonce: '0',
      to: '0x0001114',
      value: '1000000000000000000',
      type: '0x2',
      chainId: '1',
      v: '0x25',
      r: '0x0001115',
      s: '0x0001116',
    },
  },
})

export const genericArrayOfStringsMock = () => ({
  url: '/eth/v1/genericarray',
  method: 'GET',
  result: ['0x0001111', '0x0001112', '0x0001113'],
})
