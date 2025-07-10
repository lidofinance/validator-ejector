export const syncingMock = () => ({
  url: '/',
  method: 'POST',
  result: {
    result: true,
  },
  body: { jsonrpc: '2.0', method: 'eth_syncing', params: [], id: 1 },
})

export const syncingBooleanMock = (syncing = true) => ({
  url: '/',
  method: 'POST',
  result: {
    result: syncing,
  },
  body: { jsonrpc: '2.0', method: 'eth_syncing', params: [], id: 1 },
})

export const syncingObjectMock = (
  currentBlock = '0x9539a0',
  highestBlock = '0x9539a6'
) => ({
  url: '/',
  method: 'POST',
  result: {
    result: {
      startingBlock: '0x0',
      currentBlock,
      highestBlock,
    },
  },
  body: { jsonrpc: '2.0', method: 'eth_syncing', params: [], id: 1 },
})

export const lastBlockNumberMock = () => ({
  url: '/',
  method: 'POST',
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

export const funcMock = (hash = '0x0001111') => ({
  url: '/',
  method: 'POST',
  result: {
    result: hash,
  },
  body: {
    jsonrpc: '2.0',
    method: 'eth_call',
    id: 1,
  },
})
