import { z } from 'zod'
import { makeLogger } from 'lido-nanolib'
import { readFileSync } from 'fs'

// Helper function to read from file
const envOrFile = (
  env: NodeJS.ProcessEnv,
  envName: string
): string | undefined => {
  if (env[envName]) return env[envName]

  const fileEnvName = `${envName}_FILE`
  if (env[fileEnvName]) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return readFileSync(env[fileEnvName]!, 'utf-8')
    } catch (e) {
      throw new Error(`Unable to load ${fileEnvName}`, { cause: e })
    }
  }
  return undefined
}

// JSON array parser
const parseJsonArray = <T extends z.ZodTypeAny>(base: T) =>
  base.transform((val, ctx) => {
    try {
      const parsed = JSON.parse(val)
      if (!Array.isArray(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expected a JSON array',
        })
        return z.NEVER
      }
      return parsed
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid JSON: ${(e as Error).message}`,
      })
      return z.NEVER
    }
  })

export type ConfigService = ReturnType<typeof makeConfig>

export const makeConfig = ({
  env,
}: {
  logger: ReturnType<typeof makeLogger>
  env: NodeJS.ProcessEnv
}) => {
  // Config object with validation
  const config = {
    // Required fields
    EXECUTION_NODE: z
      .string({
        required_error:
          'Please, setup EXECUTION_NODE address. Example: http://1.2.3.4:8545',
      })
      .parse(env.EXECUTION_NODE),

    CONSENSUS_NODE: z
      .string({
        required_error:
          'Please, setup CONSENSUS_NODE address. Example: http://1.2.3.4:5051',
      })
      .parse(env.CONSENSUS_NODE),

    LOCATOR_ADDRESS: z
      .string({
        required_error:
          'Please, setup LOCATOR_ADDRESS address. Example: 0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      })
      .parse(env.LOCATOR_ADDRESS),

    STAKING_MODULE_ID: z
      .string({
        required_error: 'Please, setup STAKING_MODULE_ID id. Example: 123',
      })
      .parse(env.STAKING_MODULE_ID),

    OPERATOR_ID: z
      .string({
        required_error: 'Please, setup OPERATOR_ID id. Example: 123',
      })
      .parse(env.OPERATOR_ID),

    ORACLE_ADDRESSES_ALLOWLIST: parseJsonArray(
      z.string({
        required_error:
          'Please, setup ORACLE_ADDRESSES_ALLOWLIST. Example: ["0x123","0x123"]',
      })
    )
      .pipe(z.array(z.string()))
      .parse(env.ORACLE_ADDRESSES_ALLOWLIST),

    // Optional fields
    MESSAGES_LOCATION: z.string().optional().parse(env.MESSAGES_LOCATION),
    VALIDATOR_EXIT_WEBHOOK: z
      .string()
      .optional()
      .parse(env.VALIDATOR_EXIT_WEBHOOK),
    MESSAGES_PASSWORD: z
      .string()
      .optional()
      .parse(envOrFile(env, 'MESSAGES_PASSWORD')),

    // Optional with defaults
    BLOCKS_PRELOAD:
      z.coerce.number().optional().parse(env.BLOCKS_PRELOAD) ?? 50000,
    BLOCKS_LOOP: z.coerce.number().optional().parse(env.BLOCKS_LOOP) ?? 900,
    JOB_INTERVAL:
      z.coerce.number().optional().parse(env.JOB_INTERVAL) ?? 384000,
    HTTP_PORT: z.coerce.number().optional().parse(env.HTTP_PORT) ?? 8989,
    RUN_METRICS:
      z
        .union([
          z.boolean(),
          z.string().transform((v) => v.toLowerCase() === 'true'),
        ])
        .optional()
        .parse(env.RUN_METRICS) ?? false,
    RUN_HEALTH_CHECK:
      z
        .union([
          z.boolean(),
          z.string().transform((v) => v.toLowerCase() === 'true'),
        ])
        .optional()
        .parse(env.RUN_HEALTH_CHECK) ?? true,
    DRY_RUN:
      z
        .union([
          z.boolean(),
          z.string().transform((v) => v.toLowerCase() === 'true'),
        ])
        .optional()
        .parse(env.DRY_RUN) ?? false,
    DISABLE_SECURITY_DONT_USE_IN_PRODUCTION:
      z
        .union([
          z.boolean(),
          z.string().transform((v) => v.toLowerCase() === 'true'),
        ])
        .optional()
        .parse(env.DISABLE_SECURITY_DONT_USE_IN_PRODUCTION) ?? false,
    PROM_PREFIX: z.string().optional().parse(env.PROM_PREFIX),
    FORCE_DENCUN_FORK_MODE:
      z
        .union([
          z.boolean(),
          z.string().transform((v) => v.toLowerCase() === 'true'),
        ])
        .optional()
        .parse(env.FORCE_DENCUN_FORK_MODE) ?? false,
  }

  // Config validation
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

  return config
}

export const makeValidationConfig = ({ env }: { env: NodeJS.ProcessEnv }) => ({
  CONSENSUS_NODE: z
    .string({
      required_error:
        'Please, setup CONSENSUS_NODE address. Example: http://1.2.3.4:5051',
    })
    .parse(env.CONSENSUS_NODE),
  MESSAGES_LOCATION: z.string().optional().parse(env.MESSAGES_LOCATION),
  MESSAGES_PASSWORD: z
    .string()
    .optional()
    .parse(envOrFile(env, 'MESSAGES_PASSWORD')),
})

export const makeLoggerConfig = ({ env }: { env: NodeJS.ProcessEnv }) => {
  const config = {
    LOGGER_LEVEL:
      z
        .enum(['debug', 'info', 'warn', 'error'])
        .optional()
        .parse(env.LOGGER_LEVEL) ?? 'info',
    LOGGER_FORMAT:
      z.enum(['json', 'simple']).optional().parse(env.LOGGER_FORMAT) ??
      'simple',
    LOGGER_SECRETS:
      parseJsonArray(z.string())
        .pipe(z.array(z.string()))
        .optional()
        .parse(env.LOGGER_SECRETS) ?? [],
  }

  // Resolve env vars in secrets
  config.LOGGER_SECRETS = config.LOGGER_SECRETS.map(
    (envVar) => envOrFile(env, envVar) ?? envVar
  )

  return config
}

export const makeWebhookProcessorConfig = ({
  env,
}: {
  env: NodeJS.ProcessEnv
}) => ({
  WEBHOOK_ABORT_TIMEOUT_MS:
    z.coerce.number().optional().parse(env.WEBHOOK_ABORT_TIMEOUT_MS) ?? 10_000,
  WEBHOOK_MAX_RETRIES:
    z.coerce.number().optional().parse(env.WEBHOOK_MAX_RETRIES) ?? 0,
})
