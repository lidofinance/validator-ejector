# Multi-endpoint EL/CL fallback — implementation status

Branch: `feature/fallback-provider`
Plan: `~/.claude/plans/1-research-how-swirling-sketch.md`
Closes: [#94](https://github.com/lidofinance/validator-ejector/issues/94)

---

## Behaviour summary (operator-facing)

```
Configuration
  EXECUTION_NODE                 Single URL or comma-separated list. Required.
  CONSENSUS_NODE                 Single URL or comma-separated list. Required.
  JWT_SECRET_PATH                Optional. Same JWT secret applied to every EXECUTION_NODE URL.
  VOTING_EVENTS_FRAME_BLOCKS     Optional. Default 216 000 (~30 days). Lower = faster startup
                                 but motion-event security verification has a smaller window.
  LOGGER_SECRETS                 To redact each URL individually in logs, list each URL.

Startup
  Chain-id consistency check     Issue eth_chainId to every EL URL and read deposit_contract
                                 .chain_id from every CL URL. Refuse to boot if any pair
                                 disagrees (per-URL or EL≠CL). Catches mixed-network paste
                                 errors before any chain-specific signing.

Per-call semantics
  EL/CL reads (default)          Iterate URL[0] → URL[N-1] every call. On 5xx / network /
                                 timeout / JSON-RPC server-error envelope (-32603/-32005/
                                 -32000): log "endpoint failed, trying next" with idx and
                                 host, then move on.
                                 On 4xx / validation / JSON-parse / deterministic JSON-RPC
                                 errors (-32602/-32600): throw immediately (terminal).
                                 If every URL fails: throw AggregateError carrying every
                                 per-endpoint cause; logs "all endpoints exhausted".
  Voluntary exit submission       Broadcast in parallel to every CL URL via Promise.allSettled.
                                  Succeed if ≥1 endpoint accepts. If none: throw AggregateError
                                  containing every per-endpoint cause.

What this is NOT (deliberately)
  - Sticky cursor              We don't remember which URL last worked. Every call restarts at URL[0].
  - Reset interval             No env var; nothing to tune. (Removed; see "Removed" below.)
  - Round-robin / quorum       Single-success-wins, in-order. Voluntary-exit is the only fan-out.
  - Active health probing      Only the boot-time chain-id sweep. After boot, we learn an
                               endpoint is broken by trying it during real traffic.
```

---

## Architecture / call-flow

```
              ┌─────────────────┐                           ┌──────────────┐
  app code →  │  makeExecutionApi│ → elRequest(cfg)  →    fallback(op)  →  │ for each url │
              │  makeConsensusApi│   clRequest(path,cfg) → fallback(op)  →  │   try op(url)│
              └─────────────────┘                                           │   catch:     │
                                                                            │   if !fbable │
                                                                            │   throw      │
                                                                            │   else log   │
                                                                            │   continue   │
                                                                            └──────────────┘

  Inside op (per URL):
     request(url, { ...cfg, headers })
        ↓ middleware chain (per URL[i]):
     [retry(3, 2s)] → [logger] → [prom] → [notOkError] → [abort(30s)] → fetch

  Worst-case latency for one logical call:
     N urls × (retry budget within URL[i] + abort timeout)
     ≈ N × (3 × 2s + 30s) ≈ N × 36 s upper bound.
     Reality: short on a working primary; only hits worst-case during outages.
```

---

## Done

| Item | Files | Notes |
|---|---|---|
| Config schema | `src/services/config/service.ts`, `src/lib/validator/{validators,index}.ts`, `src/lib/index.ts` | New `url_list` validator: comma-split, trim, strip *all* trailing slashes, drop empties, reject empty-after-parse. `EXECUTION_NODE` and `CONSENSUS_NODE` typed as `string[]`. Single-URL configs unchanged. |
| `makeFallback` | `src/lib/fallback/index.ts` | Stateless. Signature `(urls, logger, label)`. Iterates 0→N-1. `isFallbackable` classifies: `HttpException >= 500` ✓, `FetchError` ✓, `AbortError` ✓, all else terminal. Logs `endpoint failed, trying next` (intermediate) with `{idx, url, err}` payload. On exhaustion logs `all endpoints exhausted` and throws `AggregateError(causes, "${label} fallback failed at all ${N} endpoints")` carrying every per-URL cause. Empty-URL list throws synchronously at construction. |
| `broadcastAll` | same file | `Promise.allSettled` parallel fan-out. ≥1 success returns `T[]` of successes. All fail → throws `AggregateError(causes, "${label} broadcast failed at all ${N} endpoints")`. Logs partial-success summary. Per-failure log includes `{idx, url, err}`. |
| `iterateAll` | same file | Per-URL result matrix `Array<{url, idx, value} \| {url, idx, err}>` with no short-circuit. Backs the consistency check (where divergence itself is the signal). |
| `hostOf(url)` | same file | Returns `new URL(url).host` with try/catch fallback to raw string. Used for log labels and metric tagging. |
| EL service | `src/services/execution-api/service.ts` | `elRequest` wraps the per-URL request body + headers in `fallback(...)`. JWT regenerated inside the per-attempt callback so each URL gets a fresh bearer. After parsing JSON, inspects for JSON-RPC server-error envelopes (codes -32603/-32005/-32000) and throws `HttpException(rpcErr, 502)` so fallback rotates; deterministic codes (-32602/-32600) pass through. |
| CL service | `src/services/consensus-api/service.ts` | New `clRequest(path, cfg?)` helper centralises path concatenation. All 9 call sites migrated: `syncing`, `genesis`, `state`, `spec`, `validatorInfo`, `exitRequest`, `depositContract`, `fetchValidatorsBatch`. `validatorInfo` and `exitRequest` pass `notOkError()` so 5xx triggers fallback rotation. `exitRequest` uses `broadcastAll` instead of `clRequest`. |
| Consistency check | `src/services/consistency/service.ts`, `src/app/{interface,service,module}.ts` | Boot-time `checkChainIds()` issues `eth_chainId` to every EL URL and reads `deposit_contract.chain_id` from every CL URL via `iterateAll`. Refuses to boot on per-URL or EL≠CL divergence; the existing top-level `try/catch` in `src/index.ts` does `process.exit(1)`. Runs before `executionApi.checkSync()` so mismatches surface before any chain-specific behaviour. |
| Callers updated | `src/app/module.ts`, `src/scripts/{print-capella-fork-versions,logs}.ts`, `src/scripts/validate-messages.ts`, `src/services/messages-processor/test/prepare-deps.ts` | Pass `string[]` shapes; nock mocks reference `[0]` index. |
| Test infra | `src/test/config.ts`, `src/test/mock-eth-server.ts` | `mockConfig` accepts comma-string env values; `mockEthServer` mocks single-URL nock domains. |
| Manual e2e runner | `src/scripts/test-fallback.ts` | 8 scenarios; reads URLs from env (no hardcoded secrets). `retry(0)` + `abort(5_000)` so bad-URL scenarios complete in ~5 s rather than ~45 s. |
| `VOTING_EVENTS_FRAME_BLOCKS` env override | `src/services/config/service.ts`, `src/services/exit-logs/service.ts` | Default 216 000 (production unchanged). Test sets to 1, drops the dominant motion-event lookback. exit-logs e2e: 256 s → 107 s. |
| Docs | `README.md`, `sample.env`, `sample.infra.env` | Multi-URL examples and semantics; `LOGGER_SECRETS` per-URL guidance; `VOTING_EVENTS_FRAME_BLOCKS` row. |

### Test inventory

| Suite | File | Count | Notes |
|---|---|---|---|
| Fallback unit | `src/lib/fallback/fallback.spec.ts` | 19 | makeFallback (9): happy path, retryable rotation w/ idx, terminal 4xx, FetchError+AbortError, exhaustion AggregateError, single-URL, empty list, 499/500 boundary, latency budget. broadcastAll (5): all-succeed, partial-fail w/ idx, AggregateError, empty-list, parallel-not-serialised. iterateAll (5): all-succeed, mixed success/failure no-short-circuit, all-failure no-short-circuit, empty-list, parallel. |
| Consistency unit | `src/services/consistency/consistency.spec.ts` | 7 | Single-URL match, multi-URL match, EL mismatch, CL mismatch, EL≠CL, EL network failure (503), CL malformed body. |
| Validator | `src/lib/validator/primitive.spec.ts` | 21 | Includes `url_list`: single URL, comma-separated, multiple trailing slashes, empty entries, whitespace-only input. |
| EL spec | `src/services/execution-api/el.spec.ts` | 10 | 6 single-URL + 4 multi-URL (5xx fallback, 4xx non-rotation, JSON-RPC -32603 rotates, JSON-RPC -32602 stays terminal). |
| CL spec (unit) | `src/services/consensus-api/cl.spec.ts` (`makeConsensusApi` describe) | 10 | 6 original + multi-URL fallback for `genesis` and `validatorInfo` + 4xx non-rotation + 3 broadcast (all-success, partial-success ≥1, all-fail throws AggregateError). |
| CL spec (e2e) | same file (`makeConsensusApi e2e` describe) | 3 | Hits `ethereum-beacon-api.publicnode.com`. **Currently fails** — public node lacks slot 11724253 state. Pre-existing, environmental. |
| exit-logs unit | `src/services/exit-logs/service.spec.ts` | 5 | Unaffected. |
| exit-logs e2e | `src/services/exit-logs/exit-logs.spec.ts` | 2 | Mainnet stakefish endpoints; 107 s with narrowed `VOTING_EVENTS_FRAME_BLOCKS`. |
| job-processor e2e | `src/services/job-processor/job-processor.e2e.spec.ts` | 1 | **Currently fails** — pre-existing test-design bug on `develop` (see line 153 analysis below). |
| Other | various | ~70 | Logger, request middlewares, JWT, messages-processor, etc. — unaffected. |

### Verification commands

```bash
# Build + lint
yarn build
yarn lint

# Targeted suites
yarn test --run src/lib/fallback/
yarn test --run src/lib/validator/
yarn test --run src/services/execution-api/
yarn test --run src/services/consensus-api/cl.spec.ts -t '^(?!.*e2e)'

# Full suite vs mainnet (requires stakefish endpoints in env)
EXECUTION_NODE='...,...' CONSENSUS_NODE='...,...' yarn test --run

# Manual fallback e2e (8 scenarios incl. broadcast verification)
EXECUTION_NODE='...,...' CONSENSUS_NODE='...,...' \
  node --loader ts-node/esm --disable-warning=ExperimentalWarning \
       src/scripts/test-fallback.ts
```

### Verification results (2026-05-06, post-follow-up tasks #34–#38)

| Check | Result | Notes |
|---|---|---|
| `yarn build` | ✓ | tsc clean |
| `yarn lint` | ✓ | eslint clean |
| `src/lib/fallback/` | 19/19 ✓ | +5 iterateAll cases vs prior 14 |
| `src/services/consistency/` | 7/7 ✓ | new suite |
| `src/services/execution-api/` | 10/10 ✓ | +2 JSON-RPC envelope cases vs prior 8 |
| `src/services/consensus-api/cl.spec.ts` (unit) | 10/10 ✓ | unchanged |
| `src/services/consensus-api/cl.spec.ts` (e2e) | 0/3 — pre-existing public-node failure | unrelated |
| `src/app/app.spec.ts` | 4/4 ✓ | bootstrap test still green after consistency-check wiring (auto-uses `chainIdMock` + `depositContractMock` fixtures) |
| `src/services/exit-logs/exit-logs.spec.ts` (mainnet stakefish) | 2/2 ✓ | 107 s |
| Manual e2e (Hoodi staging+production) | 8/8 ✓ | Pre-task validation. Broadcast verified hit BOTH staging and production CL with malformed payload; both rejected with the same `hex string has length 2, want 192` error; `AggregateError` fired correctly. **Has not been re-run against tasks #34/#35/#37** — test-fallback.ts does not yet exercise JSON-RPC envelope rotation, makeFallback exhaustion AggregateError shape, or chain-id consistency mismatch. |

### Pre-existing failure (not caused by this branch)

`job-processor.e2e.spec.ts:153` — `expect(ackSpy12345).not.toHaveBeenCalled()` fails. Root cause: the test mocks `exitLogs.getLogs` with hardcoded `blockNumber: 1000` but does **not** mock `executionApi.latestBlockNumber()`, so the daemon queries real mainnet and gets `~22M`. The recency condition at `service.ts:127` (`lastBlockNumber - event.blockNumber > FINALIZED_BLOCK_EQUIVALENT`) is trivially true for both events → both get `ack()`'d → test fails. Verified to fail on `develop` with all my changes stashed. Test was added in commit `2470bd8` (2025-07-04, chasingrainbows).

---

## Removed (deliberately, post-revision)

- `RPC_FALLBACK_RESET_INTERVAL_MS` env var — neither lido-council-daemon (hardcoded 10 d in `provider.constants.ts`, not env-tunable) nor lido-oracle (no reset at all) exposes this. Operators don't need to tune it; the stateless design has no reset to configure.
- Sticky cursor and "endpoint switched" log line — eliminated with the redesign.
- Cursor-race fix (capture-on-entry snapshot) — moot, no cursor.
- `now: () => number` injection in `makeFallback` — only existed to test reset-interval behaviour.
- CHANGELOG manual edits — that file is managed by GitHub Actions; the PR description carries the feature summary.

---

## Cross-project survey findings (2026-05-06, second pass)

Three parallel `general-purpose` agents surveyed `lido-council-daemon`, `lido-oracle`, and `web3py-multi-http-provider` for fallback-provider pitfalls **applicable to a stateless design**.

### High-value cross-cutting findings

| # | Finding | Source | Status |
|---|---|---|---|
| 1 | JSON-RPC 200-OK + `{error: ...}` envelope bypasses fallback | [council-daemon PR #310](https://github.com/lidofinance/lido-council-daemon/pull/310) `trackRpcCallMetrics`; [web3py-multi #2](https://github.com/lidofinance/web3py-multi-http-provider/blob/main/web3_multi_provider/multi_http_provider.py#L121) | ✅ **Done** (#34, commit `14305ba`) |
| 2 | `makeFallback` exhaustion drops earlier per-URL causes | lido-oracle `errors[-1]` pattern in `src/providers/http_provider.py` | ✅ **Done** (#35, commit `4ef76c0`) |
| 3 | URL index missing from fallback log lines | [web3py-multi PR #87](https://github.com/lidofinance/web3py-multi-http-provider/pull/87) | ✅ **Done** (#36, commit `cd6d284`) |
| 4 | No startup chain-id consistency check across endpoints | [council-daemon PR #295 review](https://github.com/lidofinance/lido-council-daemon/pull/295#discussion_r2289417385); lido-oracle `src/providers/consistency.py`; web3py-multi #4 | ✅ **Done** (#37, commit `0da3ca8` + vitest-imports follow-up `a0d43a1`) |
| 5 | JWT-shared-across-EL-endpoints docs missing in `sample.env` | council-daemon survey #8 | ✅ **Done** (#38, commit `4017009`) |

### Lower-value / N/A findings

- **Stream consumption escapes fallback** ([lido-oracle PR #897](https://github.com/lidofinance/lido-oracle/pull/897)) — N/A, we read JSON eagerly via `safelyParseJsonResponse`.
- **Bare exceptions not normalised** ([lido-oracle PR #300](https://github.com/lidofinance/lido-oracle/pull/300)) — already handled by our `node-fetch` middleware stack.
- **Implicit "latest" block reads race chain-tip skew** ([council-daemon PR #325](https://github.com/lidofinance/lido-council-daemon/pull/325)) — applicable in principle to logically-coupled multi-call sequences. Our `getLogs` uses explicit `fromBlock`/`toBlock` and CL state reads pin to `head`/`finalized` tags. No concrete vulnerability identified yet; revisit if we add new EL→CL logically-coupled reads.
- **`eth_getLogs` per-provider chunk-size heterogeneity** ([council-daemon PR #317](https://github.com/lidofinance/lido-council-daemon/pull/317)) — relevant only if operators configure providers with different `eth_getLogs` limits. We don't paginate; rely on operators to configure homogeneous chunk-tolerant nodes.
- **Don't add stateful chain-tip health probe** ([council-daemon PR #295](https://github.com/lidofinance/lido-council-daemon/pull/295)/[#282](https://github.com/lidofinance/lido-council-daemon/pull/282)) — confirmed we don't have one.
- **Metrics cardinality (full hostname vs. 2nd-level domain)** ([council-daemon PR #310](https://github.com/lidofinance/lido-council-daemon/pull/310)) — bounded for typical operators; defer normalization unless production reports issues.
- **Prysm-specific 404 short-circuit** (lido-oracle `force_raise` in `src/providers/consensus/client.py`) — advanced; voluntary-exit submission failure modes are different. Defer.
- **Catch-all `except Exception`** (web3py-multi #1) — we already discriminate; add a regression test if extending `isFallbackable`.
- **Async error-code label asymmetry** (web3py-multi #8) — N/A, no async/sync split.
- **Class-level cursor state** (web3py-multi #10) — N/A, stateless.
- **Comma-separated URL parsing edge cases** ([lido-nestjs `in-memory-configuration.ts`](https://github.com/lidofinance/lido-council-daemon/blob/main/src/common/config/in-memory-configuration.ts)) — already handled by `url_list`.

### Architectural divergences worth re-examining one day

- **No `consistency.py` startup check** — see #37.
- **No `force_raise`-style cross-host 404 agreement** — defer; voluntary-exit submission failure modes differ.
- **We treat 4xx as terminal** (lido-oracle retries 429); acceptable trade-off, document if operators report 429-rotation surprises.
- **Full hostname metric label** — could collapse to second-level domain (`a.b.example.com` → `b.example.com`) à la council-daemon, but operators self-hosting many nodes might want full hostnames. Configurable later if needed.

---

## Follow-up tasks (post-survey) — landed 2026-05-06

All five survey-identified items shipped on `feature/fallback-provider`. Commit-by-commit summary:

| # | Commit | Files (per-commit, not cumulative) | What landed |
|---|---|---|---|
| #36 | `cd6d284` | `src/lib/fallback/{index,fallback.spec}.ts` | `idx: i` added to `makeFallback` warn payload (covers both intermediate "trying next" and exhaustion "all endpoints exhausted") and to `broadcastAll`'s per-failure log. Three test matchers tightened with `idx: 0` / `idx: 2` assertions. |
| #35 | `4ef76c0` | `src/lib/fallback/{index,fallback.spec}.ts` | `makeFallback` exhaustion now throws `AggregateError(causes, "${label} fallback failed at all ${N} endpoints")` mirroring `broadcastAll`. `broadcastAll`'s `label` parameter tightened from `string` to `FallbackLabel` (consistency win). 3 tests adjusted to assert `AggregateError` instead of last-`HttpException`. |
| #38 | `4017009` | `sample.env`, `sample.infra.env` | `JWT_SECRET_PATH` comment now warns that the secret is sent to *every* `EXECUTION_NODE` URL; operators with heterogeneous EL clients must sync `jwt.hex` manually or skip JWT. Bundles the broader feature's pre-existing multi-URL EXECUTION_NODE/CONSENSUS_NODE comments that were uncommitted. |
| #34 | `14305ba` | `src/services/execution-api/{service,el.spec}.ts` | `RPC_SERVER_ERROR_CODES = {-32603, -32005, -32000}` set added; `isRpcServerError` predicate. `elRequest` inspects the parsed JSON body and throws `HttpException(rpcErr, 502)` for server-error envelopes (so fallback rotates). Deterministic codes (-32602/-32600) pass through unchanged. 2 new tests: rotates on -32603, stays terminal on -32602. |
| #37 | `0da3ca8` (+ `a0d43a1`) | `src/lib/fallback/{index,fallback.spec}.ts`, `src/services/consistency/{service,consistency.spec}.ts` (new), `src/app/{interface,service,module}.ts`, `src/services/{execution-api,consensus-api}/fixtures.ts`, `README.md` | New `iterateAll` helper in fallback (per-URL result matrix, no short-circuit) — 5 new tests. New `consistency` service with `checkChainIds()` — 7 nock-based tests covering single/multi-URL match, EL mismatch, CL mismatch, EL≠CL, EL network failure, CL malformed body. Wired into `app.run()` BEFORE `executionApi.checkSync()`. New `chainIdMock`/`depositContractMock` fixtures keep the existing `app.spec.ts` bootstrap test green. README has the "misconfigured mixed-network URLs caught at boot" note. The follow-up `a0d43a1` adds explicit `vitest` imports to the new spec to silence stale IDE diagnostics (vitest globals already satisfy `tsc`). |

Cumulative effect on the branch: tests grew from 14 fallback + 8 EL + 10 CL-unit + ~70 other to 19 fallback + 7 consistency + 10 EL + 10 CL-unit + ~70 other.

### Known gap in coverage

`src/scripts/test-fallback.ts` (manual e2e harness) was authored for the original 8 fallback scenarios and has **not** been extended to exercise the new behaviours from #34, #35, or #37. If we want to validate them against live Hoodi or mainnet endpoints, candidates:

- **#34** — point one EL URL at a public RPC known to return `-32603` under load (or use a stub server returning `{error: {code: -32603}}`); confirm rotation log + correct result.
- **#35** — point both EL/CL URL lists at unreachable hosts; confirm thrown error is `AggregateError` with `errors.length === N` rather than a single `HttpException`.
- **#37** — pass `EXECUTION_NODE=mainnet-rpc,hoodi-rpc`; confirm boot fails with the cross-URL chain-id mismatch log. Pure unit-test territory unless we want a chaos harness.

Unit tests cover all three, so this is a "nice to have" for operator confidence rather than a correctness gate.

---

## Open for follow-up (not blocking this PR)

| Item | Notes |
|---|---|
| Per-endpoint JWT secrets | Today all EL endpoints share `JWT_SECRET_PATH`. Likely needs a JSON-array env or comma-aligned with `EXECUTION_NODE`. |
| Quorum / consensus-of-N reads | Read from K of N endpoints, accept majority. Adds significant complexity; not currently requested. |
| Active health probing | Periodic background `eth_chainId` against each URL with metrics. After boot, we currently only learn an endpoint is broken by trying it during real traffic. (Boot-time sweep is now in via #37.) |
| Extend `test-fallback.ts` | Add manual e2e scenarios for #34 (RPC envelope rotation), #35 (AggregateError on exhaustion), #37 (chain-id mismatch). See "Known gap in coverage" above. |
| Fix `job-processor.e2e.spec.ts:153` | Mock `latestBlockNumber()` to a small value alongside the mocked exit-log data. Pre-existing flake on `develop`. |
| Metric-cardinality normalization | Collapse full hostname → 2nd-level domain à la council-daemon. Only if production reports issues. |
| 429 rate-limit short-circuit | Currently 4xx (incl. 429) is terminal. lido-oracle retries 429. Revisit if operators on public RPCs report rotation noise. |
| `broadcastAll` ↔ `iterateAll` refactor | Both helpers now use `Promise.allSettled`; `broadcastAll` could be implemented in terms of `iterateAll` to share the iteration primitive. Cosmetic. |
| Widen `RPC_SERVER_ERROR_CODES` | Currently `{-32603, -32005, -32000}`. JSON-RPC reserves the entire `-32099..-32000` "implementation-defined server error" range. If providers emit other codes in that range we may want to broaden the predicate to "any code in that range" rather than an explicit allow-list. |

---

## Reference URLs (for the next reader)

- lido-council-daemon: <https://github.com/lidofinance/lido-council-daemon>
- lido-oracle: <https://github.com/lidofinance/lido-oracle>
- web3py-multi-http-provider: <https://github.com/lidofinance/web3py-multi-http-provider>
- @lido-nestjs/execution (TS upstream of council-daemon): <https://github.com/lidofinance/lido-nestjs-modules>
- This issue (motivator): <https://github.com/lidofinance/validator-ejector/issues/94>
- Council-daemon fallback PRs: [#295](https://github.com/lidofinance/lido-council-daemon/pull/295) (initial), [#304](https://github.com/lidofinance/lido-council-daemon/pull/304) (10-min timeout), [#310](https://github.com/lidofinance/lido-council-daemon/pull/310) (per-endpoint metrics), [#314](https://github.com/lidofinance/lido-council-daemon/pull/314) (10-day reset, switch only on error), [#317](https://github.com/lidofinance/lido-council-daemon/pull/317) (eth_getLogs step 10k→1k), [#325](https://github.com/lidofinance/lido-council-daemon/pull/325) (explicit `blockHash`).
