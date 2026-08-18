import { ethers } from 'ethers'

export const VALIDATOR_EXIT_REQUEST_TOPIC = ethers.utils.id(
  'ValidatorExitRequest(uint256,uint256,uint256,bytes,uint256)'
)
export const CONSENSUS_REACHED_TOPIC = ethers.utils.id(
  'ConsensusReached(uint256,bytes32,uint256)'
)

const ORACLE_ADDRESS = '0x7ee534a6081d57afb25b5cff627d4d26217bb0e9'
const ORACLE_SUBMIT_REPORT_DATA_TX =
  '0xa61ee81e25ba52d6d970be34afc72fddd04712b5ab72918dd064bf3afae36151'
const ORACLE_SUBMIT_REPORT_TX =
  '0x5ed7945d37bbee8f0ecb68b5f9d7b2843bfaf8da66431ae4638c31c9bdadf176'

export const oracleValidatorExitRequestEventsMock = () => ({
  url: '/',
  method: 'POST',
  result: {
    result: [
      {
        address: '0x0',
        topics: [
          VALIDATOR_EXIT_REQUEST_TOPIC,
          '0x0000000000000000000000000000000000000000000000000000000000000001',
          '0x0000000000000000000000000000000000000000000000000000000000000029',
          '0x0000000000000000000000000000000000000000000000000000000000055d94',
        ],
        data: '0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000642475200000000000000000000000000000000000000000000000000000000000000030ab50ef06a0e48d9edf43e052f20dc912e0ba8d5b3f07051b6f2a13b094087f791af79b2780d395444a57e258d838083a00000000000000000000000000000000',
        blockNumber: '0x855ad2',
        transactionHash: ORACLE_SUBMIT_REPORT_DATA_TX,
      },
    ],
  },
  bodyMatcher: (body) =>
    body.method === 'eth_getLogs' &&
    body.params[0].topics[0] === VALIDATOR_EXIT_REQUEST_TOPIC,
})

export const oracleConsensusReachedEventsMock = () => ({
  url: '/',
  method: 'POST',
  result: {
    result: [
      {
        address: '0x0',
        topics: [
          CONSENSUS_REACHED_TOPIC,
          '0x000000000000000000000000000000000000000000000000000000000050dfbf',
        ],
        data: '0xe166591e85d2fbb507a6111cdb8b9f23e093202254b10a2a334f8b4f35f5d3a80000000000000000000000000000000000000000000000000000000000000002',
        blockNumber: '0x855acc',
        transactionHash: ORACLE_SUBMIT_REPORT_TX,
        transactionIndex: '0x5f',
        blockHash:
          '0xa7c8bccf99f9f11df3c9550761a99d55fca777e135776615064dfa5dd77ed883',
        logIndex: '0x26c',
        removed: false,
      },
    ],
  },
  bodyMatcher: (body) =>
    body.method === 'eth_getLogs' &&
    body.params[0].topics[0] === CONSENSUS_REACHED_TOPIC,
})

export const oracleSubmitReportDataTransactionMock = () => ({
  url: '/',
  method: 'POST',
  result: {
    result: {
      from: ORACLE_ADDRESS,
      gas: '0x1f8d4',
      gasPrice: '0x1353627781',
      maxFeePerGas: '0x28373c05f4',
      maxPriorityFeePerGas: '0x15752a00',
      hash: ORACLE_SUBMIT_REPORT_DATA_TX,
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
    params: [ORACLE_SUBMIT_REPORT_DATA_TX],
    id: 1,
  },
})

export const oracleSubmitReportTransactionMock = () => ({
  url: '/',
  method: 'POST',
  result: {
    result: {
      from: ORACLE_ADDRESS,
      gas: '0x1a3a4',
      gasPrice: '0x1385e0747f',
      maxFeePerGas: '0x27fdeae104',
      maxPriorityFeePerGas: '0x15752a00',
      hash: ORACLE_SUBMIT_REPORT_TX,
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
    params: [ORACLE_SUBMIT_REPORT_TX],
    id: 1,
  },
})

// Real Hoodi submitExitRequestsData transaction and its receipt log:
// https://eth-hoodi.blockscout.com/tx/0x45af2d8fb225b6c58168a4fa92d812ed8f88a67cdf28e352680dd777c2e44c59
export const HOODI_SUBMIT_EXIT_REQUESTS_DATA_TX =
  '0x45af2d8fb225b6c58168a4fa92d812ed8f88a67cdf28e352680dd777c2e44c59'
export const HOODI_EXIT_VALIDATOR_INDEX = '1201969'
export const HOODI_EXIT_VALIDATOR_PUBKEY =
  '0x93fa9b2007bdea9ea3b2a06a612efeedb5c90392e43ceb8b4278fd79435fe8ff47b8499d590027b86eceab9693ec3a77'
export const HOODI_SUBMIT_EXIT_REQUESTS_DATA_INPUT =
  '0xb8fe0ad000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000400000010000000026000000000012573193fa9b2007bdea9ea3b2a06a612efeedb5c90392e43ceb8b4278fd79435fe8ff47b8499d590027b86eceab9693ec3a77'

export const hoodiValidatorExitRequestEventsMock = (
  validatorPubkey = HOODI_EXIT_VALIDATOR_PUBKEY
) => ({
  url: '/',
  method: 'POST',
  result: {
    result: [
      {
        address: '0x8664d394c2b3278f26a1b44b967aef99707eeab2',
        topics: [
          VALIDATOR_EXIT_REQUEST_TOPIC,
          '0x0000000000000000000000000000000000000000000000000000000000000001',
          '0x0000000000000000000000000000000000000000000000000000000000000026',
          '0x0000000000000000000000000000000000000000000000000000000000125731',
        ],
        data: ethers.utils.defaultAbiCoder.encode(
          ['bytes', 'uint256'],
          [validatorPubkey, 1763148708]
        ),
        blockNumber: '0x18bd75',
        transactionHash: HOODI_SUBMIT_EXIT_REQUESTS_DATA_TX,
      },
    ],
  },
  bodyMatcher: (body) =>
    body.method === 'eth_getLogs' &&
    body.params[0].topics[0] === VALIDATOR_EXIT_REQUEST_TOPIC,
})

export const hoodiSubmitExitRequestsDataTransactionMock = ({
  input = HOODI_SUBMIT_EXIT_REQUESTS_DATA_INPUT,
}: { input?: string } = {}) => ({
  url: '/',
  method: 'POST',
  result: {
    result: {
      accessList: [],
      blockHash:
        '0xd30518a167cbfd22ebafcc92b02cd3c7f9bb822247a1ec8ad2a8ecc5a291cafd',
      blockNumber: '0x18bd75',
      chainId: '0x88bb0',
      from: '0x98255c8d4bd6d964e58e7ba91457ff2947306345',
      gas: '0xe980',
      gasPrice: '0x439de189',
      hash: HOODI_SUBMIT_EXIT_REQUESTS_DATA_TX,
      input,
      maxFeePerGas: '0x7f59c369',
      maxPriorityFeePerGas: '0x2978891',
      nonce: '0x2a',
      r: '0x9c8fd3e84b7298e1b60ec728fea0f6ae004020b919890b535e03a01731d03ec3',
      s: '0x68ed3b316b2712c3943ec8d2e8c479909ad13a9f42eda5cae1de64fb61258ffe',
      to: '0x8664d394c2b3278f26a1b44b967aef99707eeab2',
      transactionIndex: '0x53',
      type: '0x2',
      v: '0x0',
      value: '0x0',
      yParity: '0x0',
    },
  },
  body: {
    jsonrpc: '2.0',
    method: 'eth_getTransactionByHash',
    params: [HOODI_SUBMIT_EXIT_REQUESTS_DATA_TX],
    id: 1,
  },
})
