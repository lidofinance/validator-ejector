import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const HARDHAT_CLI_PATH = require.resolve('hardhat/internal/cli/bootstrap')
const DEFAULT_START_TIMEOUT_MS = 120_000

/**
 * Local Hardhat node forking mainnet for e2e tests, same helper as in
 * lido-council-daemon. The fork RPC comes from hardhat.config.cjs
 * (EXECUTION_NODE env).
 */
export class HardhatServer {
  private hardhatProcess: ChildProcessWithoutNullStreams | null = null
  private ready = false

  constructor(public readonly port: number) {}

  public get url() {
    return `http://127.0.0.1:${this.port}`
  }

  public async start(timeoutMs = DEFAULT_START_TIMEOUT_MS) {
    return new Promise<void>((resolve, reject) => {
      this.hardhatProcess = spawn(
        process.execPath,
        [HARDHAT_CLI_PATH, 'node', '--port', String(this.port)],
        { env: { ...process.env } }
      )

      if (!this.hardhatProcess) {
        return reject(new Error('Failed to start Hardhat process'))
      }

      const timeout = setTimeout(() => {
        this.hardhatProcess?.kill('SIGTERM')
        reject(new Error(`Hardhat did not become ready within ${timeoutMs} ms`))
      }, timeoutMs)

      this.hardhatProcess.stdout.on('data', (data) => {
        const output = data.toString()
        if (output.includes('Started HTTP and WebSocket JSON-RPC server')) {
          clearTimeout(timeout)
          this.ready = true
          resolve()
        }
      })

      this.hardhatProcess.stderr.on('data', (data) => {
        console.error(`Hardhat stderr: ${data}`)
      })

      this.hardhatProcess.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })

      this.hardhatProcess.on('close', (code) => {
        if (!this.ready) {
          clearTimeout(timeout)
          reject(
            new Error(
              `Hardhat process exited before readiness with code ${code}`
            )
          )
        }
      })
    })
  }

  public async stop() {
    if (!this.hardhatProcess) return

    const hardhatProcess = this.hardhatProcess
    await new Promise<void>((resolve) => {
      if (
        hardhatProcess.exitCode !== null ||
        hardhatProcess.signalCode !== null
      ) {
        resolve()
        return
      }

      const timeout = setTimeout(() => {
        hardhatProcess.kill('SIGKILL')
      }, 2_000)

      hardhatProcess.once('close', () => {
        clearTimeout(timeout)
        resolve()
      })
      hardhatProcess.kill('SIGTERM')
    })

    this.hardhatProcess = null
    this.ready = false
  }
}
