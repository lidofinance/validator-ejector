import { arr, obj, str, bool } from 'lido-nanolib'

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
            data: str(event.data),
            topics: arr(event.topics, (topics) => topics.map(str)),
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
