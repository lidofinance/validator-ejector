import { arr, obj, str } from 'lido-nanolib'

export const lastBlockNumberDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      result: obj(json.result, (result) => ({
        number: str(result.number, 'Invalid latest block number'),
      })),
    }),
    'Invalid validator LastBlockNumber response'
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
    'Empty or invalid data object from execution node for events'
  )
