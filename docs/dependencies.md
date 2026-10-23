# Dependency maintenance

The supported runtime is Node.js 24.22.1 with Yarn 1.22.22. Direct dependency
versions and security resolutions are exact. `yarn.lock` records the complete
resolved graph. Use `yarn install --frozen-lockfile --non-interactive` in CI
and when reproducing a build.

## Runtime choices

- `@chainsafe/blst` 2.2.0 provides native BLS verification. The daemon uses it
  directly with point, subgroup, and infinity checks. The old BLS wrapper and
  its JavaScript fallback are removed. Do not omit optional platform packages.
- `@lodestar/types` and `@lodestar/params` 1.50.0 provide official SSZ types
  and the voluntary-exit domain constant. The two domain/root calculations
  use these types. `@lodestar/state-transition` and `@lodestar/utils` are no
  longer needed. A direct `@chainsafe/ssz` dependency is also unnecessary;
  the compatible SSZ version belongs to `@lodestar/types`.
- `@chainsafe/bls-keystore` stays on 3.0.0 to preserve existing encrypted
  messages. Version 3.1.0 strips C0, C1, and DEL control characters after
  password normalization; 3.0.0 only applies NFKD normalization. A password
  file ending in a newline can therefore derive a different key in 3.1.0
  and fail to decrypt an existing message. The regression generates ciphertext
  at runtime with Node.js crypto, independently of the keystore library. It
  covers this boundary with a synthetic Unicode payload and password.
  No fallback or ciphertext migration is introduced. No direct advisory
  was reported for 3.0.0 during this upgrade; its `uuid` dependency remains
  covered by the scoped security resolution below. The encryptor runs with
  tsx in development and compiled JS in production.
- `ethers` stays on 5.8.0 to preserve transaction reconstruction, ABI,
  BigNumber, and recovery behavior. Moving to ethers 6 is a separate change
  to the exit-log verification boundary.
- `@aws-sdk/client-s3` 3.1155.0 and `@google-cloud/storage` 8.4.0 retain the
  cloud message stores. Tests exercise their HTTP request/response handling
  without real cloud credentials.
- `node-fetch` 3.3.2 retains the existing retry, abort, and FetchError APIs.
  The daemon does not change global HTTP/HTTPS agents for this upgrade.
- `@prometheus-io/client` 0.16.1 replaces `prom-client`. Metric names and
  labels remain unchanged.

## Build and tests

TypeScript 5.9.3 is within the supported range of the selected lint and test
tools. It is a development dependency. Vitest and coverage-v8 use 5.0.5,
Vite uses 8.3.5, and ESLint 10 uses a flat TypeScript configuration.

Hardhat 2.29.1 is a direct, locked development dependency. It preserves the
existing CommonJS config and local fork helper. It is installed with the
same Node 24 runtime as the application tests. Do not install a second,
unlocked Hardhat version with npm or bypass package engine checks.

The Dockerfile installs build and production dependencies separately.
Production output excludes tests, fixtures, Hardhat, EDR, TypeScript, and
Vitest. `scripts/check-runtime.mjs` checks the final image offline on each
supported architecture. A successful build on macOS does not verify the
Linux native packages or fork runner.

## Security review

Run `yarn audit --json` against the final lockfile, including development
dependencies. An empty advisory response for direct version candidates does
not establish that the transitive graph is clean. Any security resolution
must identify its affected path and check the parent package's used API.

### Scoped security resolutions

The resolved graph still contains old dependencies in upstream packages.
The following exact overrides are limited to the affected parent paths.
Their imported APIs remain available in the selected releases:

| Parent path | Resolution | Compatibility boundary |
| --- | --- | --- |
| `@chainsafe/bls-keystore/uuid` | 11.1.1 | Keystore calls CommonJS `v4()` without options or an output buffer. |
| `hardhat/uuid` | 11.1.1 | Hardhat analytics calls the same no-argument `v4()` API. |
| `hardhat/undici` | 6.29.1 | CommonJS `Pool`, `Client`, `Agent`, `ProxyAgent`, `request`, response body readers, and `maxRedirections` remain available. This also replaces the vulnerable busboy dependency from Undici 5. |
| `hardhat/adm-zip` | 0.6.1 | The compiler downloader uses `new AdmZip(path).extractAllTo(directory)`. |
| `solc/tmp` | 0.2.7 | The SMT helper uses `fileSync({ postfix })`, its file descriptor/name, and `removeCallback()`. |
| `mocha/diff` | 8.0.4 | Reporters use synchronous `createPatch()` and `diffWordsWithSpace()`. |
| `mocha/serialize-javascript` | 7.1.2 | Worker options use the CommonJS serializer with `unsafe: true` and `ignoreFunction: true`. |
| `@sentry/node/cookie` | 0.7.2 | The request parser uses `parse()`; the stricter cookie serializer is not its call path. |
| `@ethersproject/providers/ws` | 8.22.0 | Retains the WebSocket 8 client API within the same major. |

Some overrides cross an upstream declared major range. They require the
full application and fork tests plus checks of the affected package APIs.
They are not a claim of upstream support for every use of those packages.
Refresh compatible transitive versions through the lockfile rather than
forcing unrelated major versions globally, including BN.js 4 and 5.

### Remaining advisory

`elliptic` 6.6.1 remains in the ethers 5 dependency tree. On 2026-10-21,
[GHSA-848j-6mx2-7j84](https://github.com/advisories/GHSA-848j-6mx2-7j84)
listed no patched release. The advisory concerns ECDSA signature generation.
Production ejector uses ethers for decoding, hashing, and recovery, not
ECDSA signing. JWT uses HS256 and exit signatures use BLS. Local fork tests
can sign disposable test transactions. This limits the advisory's relevance
to the production path but does not remove it from the dependency audit or
fix elliptic generally.

Keep final audit results separate from compatibility claims. Tests establish
only the scenarios and platforms that were actually run. Deployment checks
must still verify TLS and credentials against the intended RPC and cloud
endpoints.
