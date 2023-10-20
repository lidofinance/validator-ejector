import { readFile, readdir, stat } from 'fs/promises'

export type LocalFileReaderService = ReturnType<typeof makeLocalFileReader>

import type { LoggerService } from 'lido-nanolib'

export type MessageFile = {
  filename: string
  content: string
}

export const makeLocalFileReader = ({ logger }: { logger: LoggerService }) => {
  const dirExists = async (path: string) => {
    try {
      return (await stat(path)).isDirectory()
    } catch {
      return false
    }
  }

  const readFilesFromFolder = async (path: string) => {
    if (!(await dirExists(path))) {
      logger.error('Messages directory is not accessible, exiting...')
      process.exit()
    }

    const folder = await readdir(path)

    const files: MessageFile[] = []

    for (const [ix, fileName] of folder.entries()) {
      logger.info(`${ix + 1}/${folder.length}`)

      if (!fileName.endsWith('.json')) {
        logger.warn(
          `File with invalid extension found in messages folder: ${fileName}`
        )
        continue
      }
      const file = await readFile(`${path}/${fileName}`)
      files.push({ filename: fileName, content: file.toString() })
    }

    return files
  }

  return { dirExists, readFile, readFilesFromFolder }
}
