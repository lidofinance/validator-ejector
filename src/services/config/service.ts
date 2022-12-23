import {
  bool,
  level_attr,
  makeLogger,
  num,
  str,
  optional,
  log_format,
  json_arr,
} from 'lido-nanolib'

export type ConfigService = ReturnType<typeof makeConfig>

export const makeConfig = ({
  env,
}: {
  logger: ReturnType<typeof makeLogger>
  env: NodeJS.ProcessEnv
}) => ({
  EXECUTION_NODE: str(
    env.EXECUTION_NODE,
    'Please, setup EXECUTION_NODE address. Example: http://1.2.3.4:8545'
  ),
  CONSENSUS_NODE: str(
    env.CONSENSUS_NODE,
    'Please, setup CONSENSUS_NODE address. Example: http://1.2.3.4:5051'
  ),
  CONTRACT_ADDRESS: str(
    env.CONTRACT_ADDRESS,
    'Please, setup CONTRACT_ADDRESS address. Example: 0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
  ),
  OPERATOR_ID: str(
    env.OPERATOR_ID,
    'Please, setup OPERATOR_ID id. Example: 123'
  ),
  MESSAGES_LOCATION: str(
    env.MESSAGES_LOCATION,
    'Please, setup MESSAGES_LOCATION. Example: messages'
  ),

  BLOCKS_PRELOAD:
    optional(() => num(env.BLOCKS_PRELOAD)) ?? (24 * 60 * 60) / 12, // 1 day of blocks
  BLOCKS_LOOP: optional(() => num(env.BLOCKS_LOOP)) ?? 32, // 1 epoch
  JOB_INTERVAL: optional(() => num(env.JOB_INTERVAL)) ?? 32 * 12 * 1000, // 1 epoch

  HTTP_PORT: optional(() => num(env.HTTP_PORT)) ?? false,
  RUN_METRICS: optional(() => bool(env.RUN_METRICS)) ?? false,
  RUN_HEALTH_CHECK: optional(() => bool(env.RUN_HEALTH_CHECK)) ?? false,

  DRY_RUN: optional(() => bool(env.DRY_RUN)) ?? false,
})

export const makeLoggerConfig = ({ env }: { env: NodeJS.ProcessEnv }) => ({
  LOGGER_LEVEL: optional(() => level_attr(env.LOGGER_LEVEL)) ?? 'info',
  LOGGER_FORMAT: optional(() => log_format(env.LOGGER_FORMAT)) ?? 'simple',
  LOGGER_SECRETS:
    optional(() =>
      json_arr(env.LOGGER_SECRETS, (secrets) => secrets.map(str))
    ) ?? [],
})
