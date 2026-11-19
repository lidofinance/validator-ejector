import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type { Readable } from 'node:stream'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { vi } from 'vitest'

const shutdownModule = pathToFileURL(
  join(dirname(fileURLToPath(import.meta.url)), 'shutdown.ts')
).href
const tsx = pathToFileURL(createRequire(import.meta.url).resolve('tsx')).href
// Larger than the pipe, so most of it waits in the process until read.
const queued = 8 * 1024 * 1024

const collect = (stream: Readable) => {
  const chunks: Buffer[] = []
  stream.on('data', (chunk: Buffer) => chunks.push(chunk))
  return () => Buffer.concat(chunks).toString()
}

describe('exitOnShutdownSignals', () => {
  let cwd: string
  let child: ChildProcessWithoutNullStreams | undefined

  // One Node process, as the image runs dist/src/index.js. The timer keeps
  // it alive, like the daemon's job loop and HTTP server. Nothing reads its
  // stdout until the test does.
  const start = async (lines: string[]) => {
    const script = join(cwd, 'app.ts')
    await writeFile(
      script,
      [
        `import { exitOnShutdownSignals } from ${JSON.stringify(shutdownModule)}`,
        'setInterval(() => undefined, 1000)',
        ...lines,
        "console.error('ready')",
      ].join('\n')
    )
    child = spawn(process.execPath, ['--import', tsx, script], {
      cwd,
      env: { PATH: dirname(process.execPath), TMPDIR: cwd },
    })
    const stderr = collect(child.stderr)
    const exited = once(child, 'exit')
    // 'close' also waits until the test has read all of stdout.
    const closed = once(child, 'close')
    await vi.waitFor(() => expect(stderr()).toContain('ready'), {
      timeout: 30_000,
    })
    return { child, exited, closed }
  }

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'ejector-shutdown-'))
  })

  afterEach(async () => {
    if (child?.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL')
    }
    child?.stdout.destroy()
    child = undefined
    await rm(cwd, { recursive: true, force: true })
  })

  it.each(['SIGTERM', 'SIGINT'] as const)(
    'exits with code 0 on %s',
    async (signal) => {
      const app = await start(['exitOnShutdownSignals(console)'])
      const stdout = collect(app.child.stdout)

      app.child.kill(signal)

      expect(await app.closed).toEqual([0, null])
      expect(stdout()).toBe(`Received ${signal}, shutting down\n`)
    }
  )

  it('writes the queued log lines before it exits', async () => {
    const app = await start([
      'exitOnShutdownSignals(console)',
      `console.log('x'.repeat(${queued}))`,
    ])

    app.child.kill('SIGTERM')
    const stdout = collect(app.child.stdout)

    expect(await app.closed).toEqual([0, null])
    const last = 'Received SIGTERM, shutting down\n'
    const output = stdout()
    expect(output.length).toBe(queued + 1 + last.length)
    expect(output.endsWith(`x\n${last}`)).toBe(true)
  })

  it('exits with code 0 after the timeout when nothing reads the output', async () => {
    const app = await start([
      'exitOnShutdownSignals(console, 500)',
      `console.log('x'.repeat(${queued}))`,
    ])

    app.child.kill('SIGTERM')

    expect(await app.exited).toEqual([0, null])
  })

  it('stops once when a second signal comes during the wait', async () => {
    const app = await start([
      'exitOnShutdownSignals(console)',
      `console.log('x'.repeat(${queued}))`,
    ])

    // Both signals reach the process while it waits for the reader.
    app.child.kill('SIGTERM')
    await sleep(100)
    app.child.kill('SIGINT')
    await sleep(100)
    const stdout = collect(app.child.stdout)

    expect(await app.closed).toEqual([0, null])
    expect(stdout().match(/Received SIG\w+, shutting down/g)).toEqual([
      'Received SIGTERM, shutting down',
    ])
  })
})
