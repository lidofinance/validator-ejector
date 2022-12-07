import { arr, obj, str } from 'tooling-nanolib-test'

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
            data: arr(event.data, (data) => data.map(str)),
            topics: arr(event.topics, (topics) => topics.map(str)),
          }))
        )
      ),
    }),
    'Empty data object from execution node for events'
  )
