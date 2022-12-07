import {
  bool,
  level_attr,
  makeLogger,
  num,
  str,
  optional,
} from 'tooling-nanolib-test'

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
  BLOCKS_PRELOAD: num(
    env.BLOCKS_PRELOAD,
    'Please, setup BLOCKS_PRELOAD. Example: 10000'
  ),
  BLOCKS_LOOP: num(env.BLOCKS_LOOP, 'Please, setup BLOCKS_LOOP. Example: 100'),
  MESSAGES_LOCATION: str(
    env.MESSAGES_LOCATION,
    'Please, setup MESSAGES_LOCATION. Example: messages'
  ),

  RUN_METRICS: optional(() => bool(env.RUN_METRICS)),
  METRICS_PORT: optional(() => num(env.METRICS_PORT)),

  DRY_RUN: optional(() => bool(env.DRY_RUN)) || false,

  JOB_INTERVAL: optional(() => num(env.JOB_INTERVAL)) || 10_000,

  LOGGER_LEVEL: optional(() => level_attr(env.LOGGER_LEVEL)) || 'debug',
  LOGGER_PRETTY: optional(() => bool(env.LOGGER_PRETTY)) || false,
})

export const makeLoggerConfig = ({ env }: { env: NodeJS.ProcessEnv }) => ({
  LOGGER_LEVEL: optional(() => level_attr(env.LOGGER_LEVEL)) || 'debug',
  LOGGER_PRETTY: optional(() => bool(env.LOGGER_PRETTY)) || false,
})
