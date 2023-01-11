import { readFile, readdir, stat } from 'fs/promises'

export type ReaderService = ReturnType<typeof makeReader>

export const makeReader = () => ({
  async dirExists(path: string) {
    try {
      return (await stat(path)).isDirectory()
    } catch {
      return false
    }
  },
  async dir(path: string) {
    return readdir(path)
  },
  async file(path: string) {
    return readFile(path)
  },
})
