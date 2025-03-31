import { ValidatorsToEjectCache, ValidatorsToEject } from './types.js'

export type ExitLogsCache = ReturnType<typeof makeExitLogsCacheService>

export const makeExitLogsCacheService = () => {
  const cache: ValidatorsToEjectCache = []

  let header = { startBlock: 0, endBlock: 0 }
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
