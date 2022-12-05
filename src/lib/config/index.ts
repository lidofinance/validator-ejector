import dotenv from 'dotenv'
import {
  bool,
  level_attr,
  makeLogger,
  num,
  str,
  optional,
} from 'tooling-nanolib-test'

dotenv.config()

const {
  EXECUTION_NODE,
  CONSENSUS_NODE,
  CONTRACT_ADDRESS,
  OPERATOR_ID,
  BLOCKS_PRELOAD,
  BLOCKS_LOOP,
  MESSAGES_LOCATION,

  RUN_METRICS,
  METRICS_PORT,

  LOGGER_LEVEL,
  LOGGER_PRETTY,

  DRY_RUN,

  JOB_INTERVAL,
} = process.env

export const makeConfig = ({
  logger,
}: {
  logger: ReturnType<typeof makeLogger>
}) => {
  try {
    return {
      EXECUTION_NODE: str(
        EXECUTION_NODE,
        'Please, setup EXECUTION_NODE address. Example: http://1.2.3.4:8545'
      ),
      CONSENSUS_NODE: str(
        CONSENSUS_NODE,
        'Please, setup CONSENSUS_NODE address. Example: http://1.2.3.4:5051'
      ),
      CONTRACT_ADDRESS: str(
        CONTRACT_ADDRESS,
        'Please, setup CONTRACT_ADDRESS address. Example: 0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
      ),
      OPERATOR_ID: str(
        OPERATOR_ID,
        'Please, setup OPERATOR_ID id. Example: 123'
      ),
      BLOCKS_PRELOAD: num(
        BLOCKS_PRELOAD,
        'Please, setup BLOCKS_PRELOAD. Example: 10000'
      ),
      BLOCKS_LOOP: num(BLOCKS_LOOP, 'Please, setup BLOCKS_LOOP. Example: 100'),
      MESSAGES_LOCATION: str(
        MESSAGES_LOCATION,
        'Please, setup MESSAGES_LOCATION. Example: messages'
      ),

      RUN_METRICS: optional(() => bool(RUN_METRICS)),
      METRICS_PORT: optional(() => num(METRICS_PORT)),

      DRY_RUN: optional(() => bool(DRY_RUN)) || false,

      JOB_INTERVAL: optional(() => num(JOB_INTERVAL)) || 10_000,
    }
  } catch (error) {
    logger.error(error.message)
    process.exit(1)
  }
}

export const makeLoggerConfig = () => ({
  LOGGER_LEVEL: optional(() => level_attr(LOGGER_LEVEL)) || 'debug',
  LOGGER_PRETTY: optional(() => bool(LOGGER_PRETTY)) || false,
})
