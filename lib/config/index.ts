import dotenv from 'dotenv'
import { num, optional_bool, optional_num, str } from '../validator/index.js'

dotenv.config()

const {
  EXECUTION_NODE,
  CONSENSUS_NODE,
  CONTRACT_ADDRESS,
  OPERATOR_ID,
  BLOCKS_PRELOAD,
  BLOCKS_LOOP,
  SLEEP,
  MESSAGES_LOCATION,
  RUN_METRICS,
  METRICS_PORT,
} = process.env

export const env = {
  EXECUTION_NODE: str(EXECUTION_NODE, 'Please, setup EXECUTION_NODE address. Example: http://1.2.3.4:8545'),
  CONSENSUS_NODE: str(CONSENSUS_NODE, 'Please, setup CONSENSUS_NODE address. Example: http://1.2.3.4:5051'),
  CONTRACT_ADDRESS: str(CONTRACT_ADDRESS, 'Please, setup CONTRACT_ADDRESS address. Example: 0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'),
  OPERATOR_ID: str(OPERATOR_ID, 'Please, setup OPERATOR_ID id. Example: 123'),
  BLOCKS_PRELOAD: num(BLOCKS_PRELOAD, 'Please, setup BLOCKS_PRELOAD. Example: 10000'),
  BLOCKS_LOOP: num(BLOCKS_LOOP, 'Please, setup BLOCKS_LOOP. Example: 100'),
  SLEEP: num(SLEEP, 'Please, setup SLEEP. Example: 10'),
  MESSAGES_LOCATION: str(MESSAGES_LOCATION, 'Please, setup MESSAGES_LOCATION. Example: messages'),
  RUN_METRICS: optional_bool(RUN_METRICS, 'Please, setup RUN_METRICS. Example: false'),
  METRICS_PORT: optional_num(METRICS_PORT, 'Please, setup METRICS_PORT. Example: 8080'),
}
