import dotenv from 'dotenv'
import { num, optional_bool, optional_num, str } from '../validator'

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
  EXECUTION_NODE: str(EXECUTION_NODE),
  CONSENSUS_NODE: str(CONSENSUS_NODE),
  CONTRACT_ADDRESS: str(CONTRACT_ADDRESS),
  OPERATOR_ID: str(OPERATOR_ID),
  BLOCKS_PRELOAD: num(BLOCKS_PRELOAD),
  BLOCKS_LOOP: num(BLOCKS_LOOP),
  SLEEP: num(SLEEP),
  MESSAGES_LOCATION: str(MESSAGES_LOCATION),
  RUN_METRICS: optional_bool(RUN_METRICS),
  METRICS_PORT: optional_num(METRICS_PORT),
}
