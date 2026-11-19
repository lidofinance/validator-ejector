import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { vi } from 'vitest'

const shutdownModule = pathToFileURL(
  join(dirname(fileURLToPath(import.meta.url)), 'shutdown.ts')
).href

describe('exitOnShutdownSignals', () => {
  it.each(['SIGTERM', 'SIGINT'] as const)(
    'exits with code 0 on %s',
    async (signal) => {
      const cwd = await mkdtemp(join(tmpdir(), 'ejector-shutdown-'))
      try {
        const script = join(cwd, 'app.ts')
        // The timer keeps the process alive, like the daemon's HTTP server.
        await writeFile(
          script,
          [
            `import { exitOnShutdownSignals } from ${JSON.stringify(shutdownModule)}`,
            'exitOnShutdownSignals(console)',
            'setInterval(() => undefined, 1000)',
            "console.log('ready')",
          ].join('\n')
        )
        const child = spawn(
          process.execPath,
          [createRequire(import.meta.url).resolve('tsx/cli'), script],
          { cwd, env: { PATH: dirname(process.execPath), TMPDIR: cwd } }
        )
        let output = ''
        child.stdout.on('data', (chunk) => (output += chunk))
        child.stderr.on('data', (chunk) => (output += chunk))
        const exited = once(child, 'exit')

        await vi.waitFor(() => expect(output).toContain('ready'), {
          timeout: 30_000,
        })
        child.kill(signal)

        expect(await exited).toEqual([0, null])
      } finally {
        await rm(cwd, { recursive: true, force: true })
      }
    }
  )
})
