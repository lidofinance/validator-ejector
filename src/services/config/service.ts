import {
  bool,
  level_attr,
  makeLogger,
  num,
  str,
  optional,
  log_format,
  arr,
  json_arr,
  json_obj,
  url_list,
  normalizeUrlList,
} from '../../lib/index.js'
import { readFileSync } from 'fs'

export type ConfigService = ReturnType<typeof makeConfig>
export type EjectorScope = {
  stakingModuleId: string
  operatorIds: number[]
}

export const makeConfig = ({
  env,
}: {
  logger: ReturnType<typeof makeLogger>
  env: NodeJS.ProcessEnv
}) => {
  const ejectorScope =
    optional(() => ejector_scope(env.EJECTOR_SCOPE)) ?? ([] as EjectorScope[])
  const useLegacyScope = ejectorScope.length === 0

  const config = {
    EXECUTION_NODE: url_list(
      env.EXECUTION_NODE,
      'Please, setup EXECUTION_NODE address. Example: http://1.2.3.4:8545 or http://primary:8545,http://backup:8545'
    ),
    CONSENSUS_NODE: url_list(
      env.CONSENSUS_NODE,
      'Please, setup CONSENSUS_NODE address. Example: http://1.2.3.4:5051 or http://primary:5051,http://backup:5051'
    ),
    JWT_SECRET_PATH: optional(() => str(env.JWT_SECRET_PATH)),
    LOCATOR_ADDRESS: str(
      env.LOCATOR_ADDRESS,
      'Please, setup LOCATOR_ADDRESS address. Example: 0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    ),
    STAKING_MODULE_ID: useLegacyScope
      ? optional(() =>
          String(nonNegativeInteger(env.STAKING_MODULE_ID, 'STAKING_MODULE_ID'))
        )
      : undefined,
    EJECTOR_SCOPE: ejectorScope,
    OPERATOR_ID: useLegacyScope
      ? optional(() => nonNegativeInteger(env.OPERATOR_ID, 'OPERATOR_ID'))
      : undefined,
    OPERATOR_IDENTIFIERS: useLegacyScope
      ? optional(() =>
          json_arr(
            env.OPERATOR_IDENTIFIERS,
            (oracles) =>
              oracles.map((oracle) =>
                nonNegativeInteger(oracle, 'OPERATOR_IDENTIFIERS')
              ),
            'Please, setup OPERATOR_IDENTIFIERS. Example: [1,2,3]'
          )
        )
      : undefined,
    ORACLE_ADDRESSES_ALLOWLIST: json_arr(
      env.ORACLE_ADDRESSES_ALLOWLIST,
      (oracles) => oracles.map(str),
      'Please, setup ORACLE_ADDRESSES_ALLOWLIST. Example: ["0x123","0x123"]'
    ),
    EASY_TRACK_ADDRESS: optional(() => str(env.EASY_TRACK_ADDRESS)) ?? '',
    EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST:
      optional(() =>
        json_arr(
          env.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST,
          (addresses) => addresses.map(str),
          'Please, setup EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST. Example: ["0x123","0x456"]'
        )
      ) ?? [],
    SUBMIT_TX_HASH_ALLOWLIST:
      optional(() =>
        json_arr(
          env.SUBMIT_TX_HASH_ALLOWLIST,
          (txs) => txs.map(str),
          'Please, setup SUBMIT_TX_HASH_ALLOWLIST. Example: ["0x123abc","0x456def"]'
        )
      ) ?? [],
    MESSAGES_LOCATION: optional(() => str(env.MESSAGES_LOCATION)),
    VALIDATOR_EXIT_WEBHOOK: optional(() => str(env.VALIDATOR_EXIT_WEBHOOK)),

    MESSAGES_PASSWORD: optional(() => str(envOrFile(env, 'MESSAGES_PASSWORD'))),

    BLOCKS_PRELOAD: optional(() => num(env.BLOCKS_PRELOAD)) ?? 50000, // 7 days of blocks
    VALIDATORS_BATCH_SIZE: Math.max(
      1,
      Math.floor(optional(() => num(env.VALIDATORS_BATCH_SIZE)) || 1000)
    ),
    VOTING_EVENTS_FRAME_BLOCKS:
      optional(() => num(env.VOTING_EVENTS_FRAME_BLOCKS)) ?? 216000, // ~30 days
    JOB_INTERVAL: optional(() => num(env.JOB_INTERVAL)) ?? 384000, // 1 epoch

    HTTP_PORT: optional(() => num(env.HTTP_PORT)) ?? 8989,
    RUN_METRICS:
      optional(() =>
        bool(
          env.RUN_METRICS,
          'Invalid RUN_METRICS value: expected true or false'
        )
      ) ?? false,
    RUN_HEALTH_CHECK:
      optional(() =>
        bool(
          env.RUN_HEALTH_CHECK,
          'Invalid RUN_HEALTH_CHECK value: expected true or false'
        )
      ) ?? true,

    DRY_RUN:
      optional(() =>
        bool(env.DRY_RUN, 'Invalid DRY_RUN value: expected true or false')
      ) ?? false,
    TRUST_MODE:
      optional(() =>
        bool(env.TRUST_MODE, 'Invalid TRUST_MODE value: expected true or false')
      ) ??
      optional(() =>
        bool(
          env.DISABLE_SECURITY_DONT_USE_IN_PRODUCTION,
          'Invalid DISABLE_SECURITY_DONT_USE_IN_PRODUCTION value: expected true or false'
        )
      ) ??
      false,
    PROM_PREFIX: optional(() => str(env.PROM_PREFIX)),

    FORCE_DENCUN_FORK_MODE:
      optional(() =>
        bool(
          env.FORCE_DENCUN_FORK_MODE,
          'Invalid FORCE_DENCUN_FORK_MODE value: expected true or false'
        )
      ) ?? false,

    CAPELLA_FORK_VERSION: optional(() => str(env.CAPELLA_FORK_VERSION)),

    OPERATOR_IDS: [] as number[],
    STAKING_MODULE_IDS: [] as string[],
  }

  if (config.MESSAGES_LOCATION && config.VALIDATOR_EXIT_WEBHOOK) {
    throw new Error(
      'Both MESSAGES_LOCATION and VALIDATOR_EXIT_WEBHOOK are defined. Ensure only one is set.'
    )
  }

  if (!config.MESSAGES_LOCATION && !config.VALIDATOR_EXIT_WEBHOOK) {
    throw new Error(
      'Neither MESSAGES_LOCATION nor VALIDATOR_EXIT_WEBHOOK are defined. Please set one of them.'
    )
  }

  if (!config.EJECTOR_SCOPE.length) {
    if (config.OPERATOR_IDENTIFIERS?.length)
      config.OPERATOR_IDS = config.OPERATOR_IDENTIFIERS

    if (!config.OPERATOR_IDS?.length && config.OPERATOR_ID !== undefined) {
      config.OPERATOR_IDS = [config.OPERATOR_ID]
    }

    config.EJECTOR_SCOPE = makeLegacyEjectorScope(
      config.STAKING_MODULE_ID,
      config.OPERATOR_IDS
    )
  }

  config.STAKING_MODULE_IDS = config.EJECTOR_SCOPE.map(
    (scope) => scope.stakingModuleId
  )
  config.OPERATOR_IDS = Array.from(
    new Set(config.EJECTOR_SCOPE.flatMap((scope) => scope.operatorIds))
  )

  return config
}

export const makeValidationConfig = ({ env }: { env: NodeJS.ProcessEnv }) => {
  const config = {
    CONSENSUS_NODE: url_list(
      env.CONSENSUS_NODE,
      'Please, setup CONSENSUS_NODE address. Example: http://1.2.3.4:5051 or http://primary:5051,http://backup:5051'
    ),
    MESSAGES_LOCATION: optional(() => str(env.MESSAGES_LOCATION)),
    MESSAGES_PASSWORD: optional(() => str(envOrFile(env, 'MESSAGES_PASSWORD'))),
    VALIDATORS_BATCH_SIZE: Math.max(
      1,
      Math.floor(optional(() => num(env.VALIDATORS_BATCH_SIZE)) || 1000)
    ),
  }
  return config
}

export const makeLoggerConfig = ({ env }: { env: NodeJS.ProcessEnv }) => {
  const config = {
    LOGGER_LEVEL: optional(() => level_attr(env.LOGGER_LEVEL)) ?? 'info',
    LOGGER_FORMAT: optional(() => log_format(env.LOGGER_FORMAT)) ?? 'simple',
    LOGGER_SECRETS:
      optional(() =>
        json_arr(
          env.LOGGER_SECRETS,
          (secrets) => secrets.map(str),
          'Please, setup LOGGER_SECRETS. Example: ["EXECUTION_NODE","CONSENSUS_NODE"]'
        )
      ) ?? [],
  }

  // Resolve the value of an env var if such exists. RPC endpoints are stored
  // as arrays in config logs, so include each comma-separated endpoint too.
  config.LOGGER_SECRETS = Array.from(
    new Set(
      config.LOGGER_SECRETS.flatMap((envVar) =>
        resolveLoggerSecretValues(env, envVar)
      )
    )
  )

  return config
}

export const makeWebhookProcessorConfig = ({
  env,
}: {
  env: NodeJS.ProcessEnv
}) => {
  const config = {
    WEBHOOK_ABORT_TIMEOUT_MS:
      optional(() => num(env.WEBHOOK_ABORT_TIMEOUT_MS)) ?? 10_000,
    WEBHOOK_MAX_RETRIES: optional(() => num(env.WEBHOOK_MAX_RETRIES)) ?? 0,
  }

  return config
}

const LOGGER_SECRET_URL_LIST_ENV_VARS = new Set([
  'EXECUTION_NODE',
  'CONSENSUS_NODE',
])

const nonNegativeInteger = (value: unknown, name: string): number => {
  const parsed = num(value, `${name} must be a non-negative integer`)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`)
  }
  return parsed
}

const ejector_scope = (input: unknown): EjectorScope[] => {
  const scopes = json_obj(
    input,
    (scope) =>
      Object.entries(scope).map(([stakingModuleId, operatorIds]) => {
        const parsedOperatorIds = arr(
          operatorIds,
          (ids) =>
            ids.map((id) =>
              nonNegativeInteger(
                id,
                `EJECTOR_SCOPE operators for staking module ${stakingModuleId}`
              )
            ),
          `Invalid EJECTOR_SCOPE operators for staking module ${stakingModuleId}`
        )

        if (parsedOperatorIds.length === 0) {
          throw new Error(
            `EJECTOR_SCOPE for staking module ${stakingModuleId} must include at least one operator id`
          )
        }

        return {
          stakingModuleId: String(
            nonNegativeInteger(
              stakingModuleId,
              'EJECTOR_SCOPE staking module id'
            )
          ),
          operatorIds: Array.from(new Set(parsedOperatorIds)),
        }
      }),
    'Please, setup EJECTOR_SCOPE. Example: {"1":[123],"2":[7,8]}'
  )

  if (scopes.length === 0) {
    throw new Error('EJECTOR_SCOPE must include at least one staking module')
  }

  return scopes
}

const makeLegacyEjectorScope = (
  stakingModuleId: string | undefined,
  operatorIds: number[]
): EjectorScope[] => {
  if (!stakingModuleId) {
    throw new Error(
      'At least one of EJECTOR_SCOPE or STAKING_MODULE_ID must be provided.'
    )
  }

  if (!operatorIds.length) {
    throw new Error(
      'At least one of EJECTOR_SCOPE, OPERATOR_ID or OPERATOR_IDENTIFIERS must be provided.'
    )
  }

  return [{ stakingModuleId, operatorIds: Array.from(new Set(operatorIds)) }]
}

const envOrFile = (env: NodeJS.ProcessEnv, envName: string) => {
  if (env[envName]) return env[envName]

  const extendedName = `${envName}_FILE`
  const extendedNameValue = env[extendedName]
  if (extendedNameValue) {
    try {
      return readFileSync(extendedNameValue, 'utf-8')
    } catch (e) {
      throw new Error(`Unable to load ${extendedName}`, { cause: e })
    }
  }

  return undefined
}

const resolveLoggerSecretValues = (env: NodeJS.ProcessEnv, envVar: string) => {
  const value = envOrFile(env, envVar)
  if (!value) return [envVar]

  if (!LOGGER_SECRET_URL_LIST_ENV_VARS.has(envVar)) {
    return [value]
  }

  return [value, ...normalizeUrlList(value)]
}
