import { makeJobRunner, makeLogger } from 'tooling-nanolib-test'
import { makeExecutionApi } from '../services/api/execution.js'
import { makeConfig } from '../services/config/index.js'
import { makeMessagesProcessor } from '../services/messages-loader/index.js'

export interface Dependencies {
  config: ReturnType<typeof makeConfig>
  logger: ReturnType<typeof makeLogger>
  jobRunner: ReturnType<typeof makeJobRunner>
  executionApi: ReturnType<typeof makeExecutionApi>
  messagesProcessor: ReturnType<typeof makeMessagesProcessor>
}
