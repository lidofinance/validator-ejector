import {
  bool,
  level_attr,
  makeLogger,
  num,
  str,
  optional,
  log_format,
  json_arr,
} from '../../lib/index.js'
import { readFileSync } from 'fs'

export type ConfigService = ReturnType<typeof makeConfig>

export const makeConfig = ({
  env,
}: {
  logger: ReturnType<typeof makeLogger>
  env: NodeJS.ProcessEnv
}) => {
  const config = {
    EXECUTION_NODE: str(
      env.EXECUTION_NODE,
      'Please, setup EXECUTION_NODE address. Example: http://1.2.3.4:8545'
    ),
    CONSENSUS_NODE: str(
      env.CONSENSUS_NODE,
      'Please, setup CONSENSUS_NODE address. Example: http://1.2.3.4:5051'
    ),
    JWT_SECRET_PATH: optional(() => str(env.JWT_SECRET_PATH)),
    LOCATOR_ADDRESS: str(
      env.LOCATOR_ADDRESS,
      'Please, setup LOCATOR_ADDRESS address. Example: 0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    ),
    STAKING_MODULE_ID: str(
      env.STAKING_MODULE_ID,
      'Please, setup STAKING_MODULE_ID id. Example: 123'
    ),
    OPERATOR_ID: optional(() =>
      num(env.OPERATOR_ID, 'Please, setup OPERATOR_ID id. Example: 123')
    ),
    OPERATOR_IDENTIFIERS: optional(() =>
      json_arr(
        env.OPERATOR_IDENTIFIERS,
        (oracles) => oracles.map(num),
        'Please, setup OPERATOR_IDENTIFIERS. Example: [1,2,3]'
      )
    ),
    ORACLE_ADDRESSES_ALLOWLIST: json_arr(
      env.ORACLE_ADDRESSES_ALLOWLIST,
      (oracles) => oracles.map(str),
      'Please, setup ORACLE_ADDRESSES_ALLOWLIST. Example: ["0x123","0x123"]'
    ),
    EASY_TRACK_ADDRESS: str(
      env.EASY_TRACK_ADDRESS,
      'Please, setup EASY_TRACK_ADDRESS address. Example: 0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    ),
    EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST: json_arr(
      env.EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST,
      (addresses) => addresses.map(str),
      'Please, setup EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST. Example: ["0x123","0x456"]'
    ),
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
    JOB_INTERVAL: optional(() => num(env.JOB_INTERVAL)) ?? 384000, // 1 epoch

    HTTP_PORT: optional(() => num(env.HTTP_PORT)) ?? 8989,
    RUN_METRICS: optional(() => bool(env.RUN_METRICS)) ?? false,
    RUN_HEALTH_CHECK: optional(() => bool(env.RUN_HEALTH_CHECK)) ?? true,

    DRY_RUN: optional(() => bool(env.DRY_RUN)) ?? false,
    DISABLE_SECURITY_DONT_USE_IN_PRODUCTION:
      optional(() => bool(env.DISABLE_SECURITY_DONT_USE_IN_PRODUCTION)) ??
      false,
    PROM_PREFIX: optional(() => str(env.PROM_PREFIX)),

    FORCE_DENCUN_FORK_MODE:
      optional(() => bool(env.FORCE_DENCUN_FORK_MODE)) ?? false,

    CAPELLA_FORK_VERSION: optional(() => str(env.CAPELLA_FORK_VERSION)),

    OPERATOR_IDS: [] as number[],
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

  // Populate OPERATOR_IDS from OPERATOR_IDENTIFIERS if available
  if (config.OPERATOR_IDENTIFIERS?.length)
    config.OPERATOR_IDS = config.OPERATOR_IDENTIFIERS

  // Fall back to OPERATOR_ID if OPERATOR_IDS is still empty
  if (!config.OPERATOR_IDS?.length && config.OPERATOR_ID !== undefined) {
    config.OPERATOR_IDS = [config.OPERATOR_ID]
  }

  // Validate that we have at least one operator ID configured
  if (!config.OPERATOR_IDS?.length) {
    throw new Error(
      'At least one of OPERATOR_ID or OPERATOR_IDENTIFIERS must be provided.'
    )
  }

  return config
}

export const makeValidationConfig = ({ env }: { env: NodeJS.ProcessEnv }) => {
  const config = {
    CONSENSUS_NODE: str(
      env.CONSENSUS_NODE,
      'Please, setup CONSENSUS_NODE address. Example: http://1.2.3.4:5051'
    ),
    MESSAGES_LOCATION: optional(() => str(env.MESSAGES_LOCATION)),
    MESSAGES_PASSWORD: optional(() => str(envOrFile(env, 'MESSAGES_PASSWORD'))),
  }
  return config
}

export const makeLoggerConfig = ({ env }: { env: NodeJS.ProcessEnv }) => {
  const config = {
    LOGGER_LEVEL: optional(() => level_attr(env.LOGGER_LEVEL)) ?? 'info',
    LOGGER_FORMAT: optional(() => log_format(env.LOGGER_FORMAT)) ?? 'simple',
    LOGGER_SECRETS:
      optional(() =>
        json_arr(env.LOGGER_SECRETS, (secrets) => secrets.map(str))
      ) ?? [],
  }

  // Resolve the value of an env var if such exists
  config.LOGGER_SECRETS = config.LOGGER_SECRETS.map(
    (envVar) => envOrFile(env, envVar) ?? envVar
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
