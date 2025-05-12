import { ValidatorsToEjectCache, ValidatorsToEject } from './types.js'

export type ExitLogsCache = ReturnType<typeof makeExitLogsCacheService>

export const makeExitLogsCacheService = () => {
  const cache: ValidatorsToEjectCache = []
  // Set endBlock to -1 to indicate an empty initial state.
  // This ensures logs are fetched from the beginning.
  // endBlock is incremented by 1 with each fetch.
  let header = { startBlock: 0, endBlock: -1 }
  return {
    getAll() {
      return cache
    },
    push(message: ValidatorsToEject) {
      cache.push(message)
    },
    getHeader() {
      return header
    },
    setHeader(startBlock: number, endBlock: number) {
      header = { startBlock, endBlock }
    },
  }
}
