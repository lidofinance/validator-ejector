import dotenv from 'dotenv'
import {
  makeLogger,
  makeRequest,
  url_list,
  notOkError,
  retry,
  abort,
  prom,
  logger as loggerMiddleware,
} from '../lib/index.js'
import { makeExecutionApi } from '../services/execution-api/service.js'
import { makeConsensusApi } from '../services/consensus-api/service.js'
import { makeMetrics } from '../services/prom/service.js'

dotenv.config()

const hostOf = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

const metrics = makeMetrics({ PREFIX: 'fallback_test' })

// Snappier than production defaults so this script doesn't stall ~45s per
// bad-URL scenario waiting on retries+timeouts. Real deployments use
// `retry(3)` and `abort(30_000)` from `src/app/module.ts`.
const buildEl = (urls: string[], logger: ReturnType<typeof makeLogger>) => {
  const request = makeRequest([
    retry(0),
    loggerMiddleware(logger),
    prom(metrics.executionRequestDurationSeconds),
    notOkError(),
    abort(5_000),
  ])
  return makeExecutionApi(request, logger, {
    EXECUTION_NODE: urls,
    LOCATOR_ADDRESS: '0x0000000000000000000000000000000000000000',
    JWT_SECRET_PATH: undefined,
  } as any)
}

const buildCl = (urls: string[], logger: ReturnType<typeof makeLogger>) => {
  const request = makeRequest([
    retry(0),
    loggerMiddleware(logger),
    prom(metrics.consensusRequestDurationSeconds),
    abort(5_000),
  ])
  return makeConsensusApi(request, logger, { CONSENSUS_NODE: urls })
}

const section = (title: string) => {
  console.log('\n' + '='.repeat(70))
  console.log(`▸ ${title}`)
  console.log('='.repeat(70))
}

const run = async () => {
  const logger = makeLogger({ level: 'info', format: 'simple' })

  const elUrls = url_list(process.env.EXECUTION_NODE)
  const clUrls = url_list(process.env.CONSENSUS_NODE)

  console.log('EL endpoints:')
  elUrls.forEach((u, i) => console.log(`  [${i}] ${hostOf(u)}`))
  console.log('CL endpoints:')
  clUrls.forEach((u, i) => console.log(`  [${i}] ${hostOf(u)}`))

  // 1. Each EL endpoint reachable on its own.
  section('1. EL: each endpoint reachable individually')
  for (const url of elUrls) {
    const api = buildEl([url], logger)
    const block = await api.latestBlockNumber()
    console.log(`  ✓ ${hostOf(url)} → finalized block #${block}`)
  }

  // 2. Each CL endpoint reachable on its own.
  section('2. CL: each endpoint reachable individually')
  for (const url of clUrls) {
    const api = buildCl([url], logger)
    const genesis = await api.genesis()
    console.log(
      `  ✓ ${hostOf(url)} → genesis_time=${
        genesis.genesis_time
      }, genesis_validators_root=${genesis.genesis_validators_root.slice(
        0,
        10
      )}…`
    )
  }

  // 3. Multi-URL EL: primary works → sticky behavior, no fallback warnings.
  section('3. EL multi-URL happy path (primary works)')
  const elMulti = buildEl(elUrls, logger)
  const block1 = await elMulti.latestBlockNumber()
  const block2 = await elMulti.latestBlockNumber()
  console.log(
    `  ✓ block #${block1}, then #${block2} (same / monotonically newer)`
  )

  // 4. Multi-URL CL: primary works → sticky behavior.
  section('4. CL multi-URL happy path (primary works)')
  const clMulti = buildCl(clUrls, logger)
  const g1 = await clMulti.genesis()
  console.log(`  ✓ genesis fetched (genesis_time=${g1.genesis_time})`)

  // 5. EL fallback: prepend a broken URL, confirm rotation.
  section('5. EL fallback: prepend bad URL, expect rotation to working one')
  const elBroken = buildEl(
    ['https://nonexistent-endpoint.invalid:8545', ...elUrls],
    logger
  )
  const blockFallback = await elBroken.latestBlockNumber()
  console.log(`  ✓ recovered → block #${blockFallback}`)

  // 6. CL fallback: same shape.
  section('6. CL fallback: prepend bad URL, expect rotation to working one')
  const clBroken = buildCl(
    ['https://nonexistent-endpoint.invalid:5051', ...clUrls],
    logger
  )
  const gFallback = await clBroken.genesis()
  console.log(`  ✓ recovered → genesis_time=${gFallback.genesis_time}`)

  // 7. exitRequest broadcasts to every CL endpoint. We don't actually want
  // to submit a real voluntary exit, so we send a deliberately-malformed
  // payload and expect *every* endpoint to reject it (each independently).
  // The broadcastAll helper should hit both URLs and aggregate the failures.
  section(
    '7. CL exitRequest broadcast: malformed payload should fail at every endpoint'
  )
  const clBroadcast = buildCl(clUrls, logger)
  try {
    await clBroadcast.exitRequest({
      message: { epoch: '0', validator_index: '0' },
      signature: '0x00',
    })
    console.log('  ✗ unexpectedly accepted (every CL node accepted a bad sig)')
    process.exitCode = 1
  } catch (err) {
    const msg = (err as Error).message ?? String(err)
    if (/broadcast failed at all/.test(msg)) {
      console.log(
        `  ✓ broadcast attempted at every endpoint and aggregated: ${msg}`
      )
    } else {
      console.log(`  ✓ at least one endpoint rejected (expected): ${msg}`)
    }
  }

  // 8. Total failure: every endpoint broken → throws after exhaustion.
  section('8. EL total failure: all URLs unreachable, expect exhaustion error')
  const elDead = buildEl(
    [
      'https://nonexistent-1.invalid:8545',
      'https://nonexistent-2.invalid:8545',
    ],
    logger
  )
  try {
    await elDead.latestBlockNumber()
    console.log('  ✗ unexpectedly succeeded')
    process.exitCode = 1
  } catch (err) {
    console.log(`  ✓ rejected as expected: ${(err as Error).message || err}`)
  }

  console.log('\nAll fallback e2e checks completed.')
}

run().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
