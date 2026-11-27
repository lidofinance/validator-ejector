import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { mockLogger } from '../../test/logger.js'
import { makeLocalFileReader } from './service.js'

describe('local file reader', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ejector-messages-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  test('an inaccessible messages directory fails the read and does not exit', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called')
    }) as never)
    const reader = makeLocalFileReader({ logger: mockLogger() })

    try {
      await expect(
        reader.readFilesFromFolder(join(dir, 'missing'))
      ).rejects.toThrow('Messages directory is not accessible')
      expect(exit).not.toHaveBeenCalled()
    } finally {
      exit.mockRestore()
    }
  })

  test('reads the json files and warns about the others', async () => {
    const logger = mockLogger()
    const reader = makeLocalFileReader({ logger })
    await writeFile(join(dir, 'exit.json'), '{"message":1}')
    await writeFile(join(dir, 'notes.txt'), 'skip')

    const files = await reader.readFilesFromFolder(dir)

    expect(files).toEqual([{ filename: 'exit.json', content: '{"message":1}' }])
    expect(logger.warn).toHaveBeenCalledWith(
      'File with invalid extension found in messages folder: notes.txt'
    )
  })
})
