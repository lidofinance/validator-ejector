import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import http from 'node:http'
import { createRequire } from 'node:module'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { utils } from 'ethers'

import {
  chainIdMock,
  lastBlockNumberMock,
  syncingBooleanMock,
} from '../src/services/execution-api/fixtures.js'
import {
  depositContractMock,
  genesisMock,
  nodeSyncingMock,
  stateMock,
} from '../src/services/consensus-api/fixtures.js'

// Run with the local tsx CLI after building. No .env or ambient credentials
// are inherited by the app processes. All configured endpoints are loopback.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const locator = '0x0000000000000000000000000000000000000001'
const exitBus = '0x0000000000000000000000000000000000000002'
const consensus = '0x0000000000000000000000000000000000000003'
const contract = new utils.Interface([
  'function validatorsExitBusOracle() view returns (address)',
  'function getConsensusContract() view returns (address)',
])

const listen = async (server: http.Server) => {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return (server.address() as AddressInfo).port
}

const close = async (server: http.Server) => {
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

const stop = async (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      // The tsx CLI and its app child belong to this dedicated process group.
      process.kill(-child.pid!, 'SIGKILL')
      reject(new Error('App process did not stop after SIGTERM'))
    }, 5000)
    child.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
    process.kill(-child.pid!, 'SIGTERM')
  })
}

const check = async (mode: 'dev' | 'built') => {
  const cwd = await mkdtemp(join(tmpdir(), 'ejector-startup-'))
  const calls: string[] = []
  const unexpected: string[] = []
  let child: ChildProcess | undefined
  let output = ''
  let spawnError: Error | undefined
  const fixture = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    try {
      if (req.method === 'POST' && req.url === '/el') {
        let body = ''
        for await (const chunk of req) body += chunk.toString()
        const rpc = JSON.parse(body)
        calls.push(rpc.method)
        let result: unknown
        switch (rpc.method) {
          case 'eth_chainId':
            result = chainIdMock().result.result
            break
          case 'eth_syncing':
            result = syncingBooleanMock(false).result.result
            break
          case 'eth_getBlockByNumber':
            assert.deepEqual(rpc.params, ['finalized', false])
            result = lastBlockNumberMock().result.result
            break
          case 'eth_call': {
            const [call, tag] = rpc.params
            assert.equal(tag, 'finalized')
            const parsed = contract.parseTransaction({ data: call.data })
            if (parsed.name === 'validatorsExitBusOracle') {
              assert.equal(call.to.toLowerCase(), locator)
              result = contract.encodeFunctionResult(parsed.name, [exitBus])
            } else {
              assert.equal(parsed.name, 'getConsensusContract')
              assert.equal(call.to.toLowerCase(), exitBus)
              result = contract.encodeFunctionResult(parsed.name, [consensus])
            }
            break
          }
          case 'eth_getLogs':
            assert.equal(rpc.params[0].address.toLowerCase(), exitBus)
            result = []
            break
          default:
            throw new Error(`Unexpected JSON-RPC method ${rpc.method}`)
        }
        res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result }))
        return
      }
      assert.equal(req.method, 'GET')
      calls.push(req.url!)
      const syncing = nodeSyncingMock()
      syncing.result.data.is_syncing = false
      const genesis = genesisMock()
      genesis.result.data.genesis_validators_root = `0x${'11'.repeat(32)}`
      const routes = [depositContractMock(), syncing, genesis, stateMock()]
      const matched = routes.find(({ url }) => `/cl${url}` === req.url)
      assert.ok(matched, `Unexpected fixture route ${req.url}`)
      res.end(JSON.stringify(matched.result))
    } catch {
      const message = 'Fixture request failed'
      unexpected.push(message)
      res.statusCode = 400
      res.end(JSON.stringify({ message }))
    }
  })

  try {
    await mkdir(join(cwd, 'messages'))
    await copyFile(join(root, 'package.json'), join(cwd, 'package.json'))
    const fixturePort = await listen(fixture)
    // Reserve an unused local port before starting the actual app listener.
    const reservation = http.createServer()
    const appPort = await listen(reservation)
    await close(reservation)
    const endpoint = `http://127.0.0.1:${fixturePort}`
    const args =
      mode === 'dev'
        ? [require.resolve('tsx/cli'), join(root, 'src/index.ts')]
        : [join(root, 'dist/src/index.js')]
    child = spawn(process.execPath, args, {
      cwd,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        PATH: dirname(process.execPath),
        TMPDIR: cwd,
        NODE_ENV: 'test',
        EXECUTION_NODE: `${endpoint}/el`,
        CONSENSUS_NODE: `${endpoint}/cl`,
        LOCATOR_ADDRESS: locator,
        EJECTOR_SCOPE: '{"1":[1]}',
        ORACLE_ADDRESSES_ALLOWLIST: JSON.stringify([consensus]),
        SUBMIT_TX_HASH_ALLOWLIST: '[]',
        MESSAGES_LOCATION: join(cwd, 'messages'),
        BLOCKS_PRELOAD: '10',
        LOAD_LOGS_STEP: '100',
        JOB_INTERVAL: '60000',
        HTTP_PORT: String(appPort),
        RUN_METRICS: 'true',
        RUN_HEALTH_CHECK: 'true',
        DRY_RUN: 'true',
        TRUST_MODE: 'false',
        LOGGER_LEVEL: 'info',
        LOGGER_FORMAT: 'json',
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'fixture-access-key',
        AWS_SECRET_ACCESS_KEY: 'fixture-secret-key',
        AWS_EC2_METADATA_DISABLED: 'true',
        AWS_ENDPOINT_URL_S3: `${endpoint}/unexpected-s3`,
        STORAGE_EMULATOR_HOST: `${endpoint}/unexpected-gcs`,
      },
    })
    const capture = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-64_000)
    }
    child.stdout!.on('data', capture)
    child.stderr!.on('data', capture)
    child.once('error', (error) => {
      spawnError = error
    })

    const deadline = Date.now() + 20_000
    while (!output.includes('Initial events loaded in')) {
      if (spawnError) throw spawnError
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`${mode} exited before startup completed:\n${output}`)
      }
      if (unexpected.length) throw new Error(unexpected.join('\n'))
      if (Date.now() > deadline) {
        throw new Error(`${mode} startup timed out:\n${output}`)
      }
      await sleep(50)
    }
    assert.ok(output.includes('Job finished'), output)
    assert.ok(!output.includes('Job ended with error'), output)
    assert.ok(!output.includes('"level":"error"'), output)
    const health = await fetch(`http://127.0.0.1:${appPort}/health`, {
      signal: AbortSignal.timeout(2000),
    })
    assert.equal(health.status, 200)
    assert.deepEqual(await health.json(), { status: 'ok' })
    const metrics = await fetch(`http://127.0.0.1:${appPort}/metrics`, {
      signal: AbortSignal.timeout(2000),
    })
    assert.equal(metrics.status, 200)
    assert.match(metrics.headers.get('content-type')!, /text\/plain/)
    const text = await metrics.text()
    const successfulJobs = text.split('\n').filter((line) => {
      return (
        line.startsWith('validator_ejector_job_duration_seconds_count{') &&
        line.includes('result="success"')
      )
    })
    assert.equal(successfulJobs.length, 1)
    assert.match(successfulJobs[0], / 1$/)
    assert.match(text, /validator_ejector_build_info\{[^\n]*mode="message"/)
    for (const required of [
      'eth_chainId',
      'eth_syncing',
      'eth_call',
      'eth_getBlockByNumber',
      'eth_getLogs',
      '/cl/eth/v1/config/deposit_contract',
      '/cl/eth/v1/node/syncing',
      '/cl/eth/v1/beacon/genesis',
      '/cl/eth/v1/beacon/states/finalized/fork',
    ]) {
      assert.ok(calls.includes(required), `Missing request: ${required}`)
    }
    assert.deepEqual(unexpected, [])
    console.log(
      JSON.stringify({
        mode,
        node: process.version,
        health: 'ok',
        metrics: 'ok',
        completedJobs: 1,
        fixtureRequests: calls.length,
      })
    )
  } finally {
    try {
      if (child) await stop(child)
    } finally {
      if (fixture.listening) await close(fixture)
      await rm(cwd, { recursive: true, force: true })
    }
  }
}

const mode = process.argv[2]
assert.ok(mode === undefined || mode === 'dev' || mode === 'built')
for (const current of ['dev', 'built'] as const) {
  if (mode === undefined || mode === current) await check(current)
}
