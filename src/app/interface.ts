import { makeJobRunner, makeLogger } from 'tooling-nanolib-test'
import { makeExecutionApi } from '../services/api/execution.js'
import type { ConfigService } from '../services/config/service'
import type { MessagesProcessorService } from '../services/messages-processor/service.js'

export interface Dependencies {
  config: ConfigService
  logger: ReturnType<typeof makeLogger>
  jobRunner: ReturnType<typeof makeJobRunner>
  executionApi: ReturnType<typeof makeExecutionApi>
  messagesProcessor: MessagesProcessorService
}
