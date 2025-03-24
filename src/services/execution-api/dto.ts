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

export const funcDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      result: str(json.result),
    }),
    'Invalid function call response'
  )

export const genericArrayOfStringsDTO = (json: unknown) =>
  arr(
    json,
    (json) => json.map((address) => str(address)),
    'Decoded generic function return format is not an array of strings'
  )
