import { arr, obj, str, bool } from '../../lib/index.js'

export const syncingDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      result: bool(json.result),
    }),
    'Invalid syncing response'
  )

export const lastBlockNumberDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      result: obj(json.result, (result) => ({
        number: str(result.number, 'Invalid latest block number'),
      })),
    }),
    'Invalid LastBlockNumber response'
  )

export const logsDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      result: arr(json.result, (result) =>
        result.map((event) =>
          obj(event, (event) => ({
            topics: arr(event.topics, (topics) => topics.map(str)),
            data: str(event.data),
            blockNumber: str(event.blockNumber),
            transactionHash: str(event.transactionHash),
          }))
        )
      ),
    }),
    'Empty or invalid data for events'
  )

export const funcDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      result: str(json.result),
    }),
    'Invalid function call response'
  )

export const txDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      result: obj(json.result, (result) => ({
        from: str(result.from),
        gas: str(result.gas),
        gasPrice: str(result.gasPrice),
        maxFeePerGas: str(result.maxFeePerGas),
        maxPriorityFeePerGas: str(result.maxPriorityFeePerGas),
        hash: str(result.hash),
        input: str(result.input),
        nonce: str(result.nonce),
        to: str(result.to),
        value: str(result.value),
        type: str(result.type),
        chainId: str(result.chainId),
        v: str(result.v),
        r: str(result.r),
        s: str(result.s),
      })),
    }),
    'Invalid return for a transaction data call'
  )

export const genericArrayOfStringsDTO = (json: unknown) =>
  arr(
    json,
    (json) => json.map((address) => str(address)),
    'Decoded generic function return format is not an array of strings'
  )
