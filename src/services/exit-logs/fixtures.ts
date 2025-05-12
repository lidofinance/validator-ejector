export const logsMock = () => ({
  url: '/',
  method: 'POST',
  result: {
    result: [
      {
        topics: [
          '0x96395f55c4997466e5035d777f0e1ba82b8cae217aaad05cf07839eb7c75bcf2',
          '0x0000000000000000000000000000000000000000000000000000000000000001',
          '0x0000000000000000000000000000000000000000000000000000000000000029',
          '0x0000000000000000000000000000000000000000000000000000000000055d94',
        ],
        data: '0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000642475200000000000000000000000000000000000000000000000000000000000000030ab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a00000000000000000000000000000000',
        blockNumber: '0x855ad2',
        transactionHash:
          '0xa61ee81e25ba52d6d970be34afc72fddd04712b5ab72918dd064bf3afae36151',
      },
    ],
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

export const logsSecurityMock = () => ({
  url: '/',
  method: 'POST',
  result: {
    result: [
      {
        address: '0x8374b4ac337d7e367ea1ef54bb29880c3f036a51',
        topics: [
          '0x2b6bc782c916fa763822f1e50c6db0f95dade36d6541a8a4cbe070735b8b226d',
          '0x000000000000000000000000000000000000000000000000000000000050dfbf',
        ],
        data: '0xe166591e85d2fbb507a6111cdb8b9f23e093202254b10a2a334f8b4f35f5d3a80000000000000000000000000000000000000000000000000000000000000002',
        blockNumber: '0x855acc',
        transactionHash:
          '0x5ed7945d37bbee8f0ecb68b5f9d7b2843bfaf8da66431ae4638c31c9bdadf176',
        transactionIndex: '0x5f',
        blockHash:
          '0xa7c8bccf99f9f11df3c9550761a99d55fca777e135776615064dfa5dd77ed883',
        logIndex: '0x26c',
        removed: false,
      },
    ],
  },
  body: {
    jsonrpc: '2.0',
    method: 'eth_getLogs',
    params: [
      {
        fromBlock: '0x853eb2',
        toBlock: '0x855ad2',
        topics: [
          '0x2b6bc782c916fa763822f1e50c6db0f95dade36d6541a8a4cbe070735b8b226d',
          '0x000000000000000000000000000000000000000000000000000000000050dfbf',
        ],
      },
    ],
  },
})
//!!
export const txMock = () => ({
  url: '/',
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
  body: {
    jsonrpc: '2.0',
    method: 'eth_getTransactionByHash',
    id: 1,
  },
})

export const genericArrayOfStringsMock = () => ({
  url: '/eth/v1/genericarray',
  method: 'GET',
  result: ['0x0001111', '0x0001112', '0x0001113'],
})

export const txFirstVerificationMock = () => ({
  url: '/',
  method: 'POST',
  result: {
    result: {
      from: '0x7ee534a6081d57afb25b5cff627d4d26217bb0e9',
      gas: '0x1f8d4',
      gasPrice: '0x1353627781',
      maxFeePerGas: '0x28373c05f4',
      maxPriorityFeePerGas: '0x15752a00',
      hash: '0xa61ee81e25ba52d6d970be34afc72fddd04712b5ab72918dd064bf3afae36151',
      input:
        '0x294492c8000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000050dfbf0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000004000000100000000290000000000055d94ab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a',
      nonce: '0xa2',
      to: '0xb75a55efab5a8f5224ae93b34b25741edd3da98b',
      value: '0x0',
      type: '0x2',
      chainId: '0x5',
      v: '0x0',
      r: '0x11835aa656583cf2000b97f11a31d7ad9feab703267db724fb50ffb9d3e571e8',
      s: '0x4b5612dcd9218d337520eb9d7aa4dcae3ac0438bfbbe90d8e0a36d14713da1c2',
    },
  },
  body: {
    jsonrpc: '2.0',
    method: 'eth_getTransactionByHash',
    params: [
      '0xa61ee81e25ba52d6d970be34afc72fddd04712b5ab72918dd064bf3afae36151',
    ],
    id: 1,
  },
})

export const txSecondVerificationMock = () => ({
  url: '/',
  method: 'POST',
  result: {
    result: {
      from: '0x7ee534a6081d57afb25b5cff627d4d26217bb0e9',
      gas: '0x1a3a4',
      gasPrice: '0x1385e0747f',
      maxFeePerGas: '0x27fdeae104',
      maxPriorityFeePerGas: '0x15752a00',
      hash: '0x5ed7945d37bbee8f0ecb68b5f9d7b2843bfaf8da66431ae4638c31c9bdadf176',
      input:
        '0xe33a8d39000000000000000000000000000000000000000000000000000000000050dfbfe166591e85d2fbb507a6111cdb8b9f23e093202254b10a2a334f8b4f35f5d3a80000000000000000000000000000000000000000000000000000000000000001',
      nonce: '0xa1',
      to: '0x8374b4ac337d7e367ea1ef54bb29880c3f036a51',
      value: '0x0',
      type: '0x2',
      chainId: '0x5',
      v: '0x0',
      r: '0x5e6ea6f5e19667ab4bed8d12cef874d68f95318cb6c196676a8a363c64f66b31',
      s: '0x1d7c48feb50382b165263d4ca8f660384b5981b5e8da652811a55f8d7a7542ad',
    },
  },
  body: {
    jsonrpc: '2.0',
    method: 'eth_getTransactionByHash',
    params: [
      '0x5ed7945d37bbee8f0ecb68b5f9d7b2843bfaf8da66431ae4638c31c9bdadf176',
    ],
    id: 1,
  },
})
