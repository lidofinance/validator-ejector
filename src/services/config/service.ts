import { z } from 'zod'
import { makeLogger } from 'lido-nanolib'
import { readFileSync } from 'fs'

// Schema definitions
const stringSchema = z.string()
const booleanSchema = z.union([
  z.boolean(),
  z.string().transform((val) => val.toLowerCase() === 'true'),
])
const logLevelSchema = z.enum([
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
])
const logFormatSchema = z.enum(['json', 'simple'])

// Helper function to read from file
const envOrFile = (
  env: NodeJS.ProcessEnv,
  envName: string
): string | undefined => {
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

// Parse with error message
const parseWithMessage = <T extends z.ZodTypeAny>(
  schema: T,
  value: unknown,
  message: string
): z.infer<T> => {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new Error(message)
  }
  return result.data
}

// Type-safe schema for Oracle addresses array
const jsonArraySchema = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .string()
    .transform((str, ctx) => {
      try {
        return JSON.parse(str)
      } catch (e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid JSON: ${(e as Error).message}`,
        })
        return z.NEVER
      }
    })
    .pipe(schema)

const oracleAddressesSchema = jsonArraySchema(z.array(z.string()))
type OracleAddresses = z.infer<typeof oracleAddressesSchema>

export type ConfigService = ReturnType<typeof makeConfig>

export const makeConfig = ({
  env,
}: {
  logger: ReturnType<typeof makeLogger>
  env: NodeJS.ProcessEnv
}) => {
  // Define required fields with custom error messages
  const EXECUTION_NODE = parseWithMessage(
    stringSchema,
    env.EXECUTION_NODE,
    'Please, setup EXECUTION_NODE address. Example: http://1.2.3.4:8545'
  )

  const CONSENSUS_NODE = parseWithMessage(
    stringSchema,
    env.CONSENSUS_NODE,
    'Please, setup CONSENSUS_NODE address. Example: http://1.2.3.4:5051'
  )

  const LOCATOR_ADDRESS = parseWithMessage(
    stringSchema,
    env.LOCATOR_ADDRESS,
    'Please, setup LOCATOR_ADDRESS address. Example: 0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
  )

  const STAKING_MODULE_ID = parseWithMessage(
    stringSchema,
    env.STAKING_MODULE_ID,
    'Please, setup STAKING_MODULE_ID id. Example: 123'
  )

  const OPERATOR_ID = parseWithMessage(
    stringSchema,
    env.OPERATOR_ID,
    'Please, setup OPERATOR_ID id. Example: 123'
  )

  const ORACLE_ADDRESSES_ALLOWLIST = parseWithMessage(
    oracleAddressesSchema,
    env.ORACLE_ADDRESSES_ALLOWLIST,
    'Please, setup ORACLE_ADDRESSES_ALLOWLIST. Example: ["0x123","0x123"]'
  )

  // Optional fields
  const MESSAGES_LOCATION = z.string().optional().parse(env.MESSAGES_LOCATION)
  const VALIDATOR_EXIT_WEBHOOK = z
    .string()
    .optional()
    .parse(env.VALIDATOR_EXIT_WEBHOOK)
  const MESSAGES_PASSWORD = z
    .string()
    .optional()
    .parse(envOrFile(env, 'MESSAGES_PASSWORD'))

  const BLOCKS_PRELOAD =
    z.coerce.number().optional().parse(env.BLOCKS_PRELOAD) ?? 50000 // 7 days of blocks
  const BLOCKS_LOOP = z.coerce.number().optional().parse(env.BLOCKS_LOOP) ?? 900 // 3 hours of blocks
  const JOB_INTERVAL =
    z.coerce.number().optional().parse(env.JOB_INTERVAL) ?? 384000 // 1 epoch

  const HTTP_PORT = z.coerce.number().optional().parse(env.HTTP_PORT) ?? 8989
  const RUN_METRICS = booleanSchema.optional().parse(env.RUN_METRICS) ?? false
  const RUN_HEALTH_CHECK =
    booleanSchema.optional().parse(env.RUN_HEALTH_CHECK) ?? true

  const DRY_RUN = booleanSchema.optional().parse(env.DRY_RUN) ?? false
  const DISABLE_SECURITY_DONT_USE_IN_PRODUCTION =
    booleanSchema
      .optional()
      .parse(env.DISABLE_SECURITY_DONT_USE_IN_PRODUCTION) ?? false

  const PROM_PREFIX = z.string().optional().parse(env.PROM_PREFIX)
  const FORCE_DENCUN_FORK_MODE =
    booleanSchema.optional().parse(env.FORCE_DENCUN_FORK_MODE) ?? false

  // Config validation
  if (MESSAGES_LOCATION && VALIDATOR_EXIT_WEBHOOK) {
    throw new Error(
      'Both MESSAGES_LOCATION and VALIDATOR_EXIT_WEBHOOK are defined. Ensure only one is set.'
    )
  }

  if (!MESSAGES_LOCATION && !VALIDATOR_EXIT_WEBHOOK) {
    throw new Error(
      'Neither MESSAGES_LOCATION nor VALIDATOR_EXIT_WEBHOOK are defined. Please set one of them.'
    )
  }

  return {
    EXECUTION_NODE,
    CONSENSUS_NODE,
    LOCATOR_ADDRESS,
    STAKING_MODULE_ID,
    OPERATOR_ID,
    ORACLE_ADDRESSES_ALLOWLIST,
    MESSAGES_LOCATION,
    VALIDATOR_EXIT_WEBHOOK,
    MESSAGES_PASSWORD,
    BLOCKS_PRELOAD,
    BLOCKS_LOOP,
    JOB_INTERVAL,
    HTTP_PORT,
    RUN_METRICS,
    RUN_HEALTH_CHECK,
    DRY_RUN,
    DISABLE_SECURITY_DONT_USE_IN_PRODUCTION,
    PROM_PREFIX,
    FORCE_DENCUN_FORK_MODE,
  }
}

export const makeValidationConfig = ({ env }: { env: NodeJS.ProcessEnv }) => {
  const CONSENSUS_NODE = parseWithMessage(
    stringSchema,
    env.CONSENSUS_NODE,
    'Please, setup CONSENSUS_NODE address. Example: http://1.2.3.4:5051'
  )

  const MESSAGES_LOCATION = z.string().optional().parse(env.MESSAGES_LOCATION)
  const MESSAGES_PASSWORD = z
    .string()
    .optional()
    .parse(envOrFile(env, 'MESSAGES_PASSWORD'))

  return {
    CONSENSUS_NODE,
    MESSAGES_LOCATION,
    MESSAGES_PASSWORD,
  }
}

export const makeLoggerConfig = ({ env }: { env: NodeJS.ProcessEnv }) => {
  const LOGGER_LEVEL =
    logLevelSchema.optional().parse(env.LOGGER_LEVEL) ?? 'info'
  const LOGGER_FORMAT =
    logFormatSchema.optional().parse(env.LOGGER_FORMAT) ?? 'simple'

  // Define the schema for logger secrets array
  const secretsArraySchema = jsonArraySchema(z.array(z.string()))
  let LOGGER_SECRETS =
    secretsArraySchema.optional().parse(env.LOGGER_SECRETS) ?? []

  // Resolve the value of an env var if such exists
  LOGGER_SECRETS = LOGGER_SECRETS.map(
    (envVar) => envOrFile(env, envVar) ?? envVar
  )

  return {
    LOGGER_LEVEL,
    LOGGER_FORMAT,
    LOGGER_SECRETS,
  }
}

export const makeWebhookProcessorConfig = ({
  env,
}: {
  env: NodeJS.ProcessEnv
}) => {
  const WEBHOOK_ABORT_TIMEOUT_MS =
    z.coerce.number().optional().parse(env.WEBHOOK_ABORT_TIMEOUT_MS) ?? 10_000
  const WEBHOOK_MAX_RETRIES =
    z.coerce.number().optional().parse(env.WEBHOOK_MAX_RETRIES) ?? 0

  return {
    WEBHOOK_ABORT_TIMEOUT_MS,
    WEBHOOK_MAX_RETRIES,
  }
}
