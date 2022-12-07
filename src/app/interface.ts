import { makeJobRunner, makeLogger } from 'tooling-nanolib-test'
import type { ExecutionApiService } from '../services/execution-api/service.js'
import type { ConfigService } from '../services/config/service.js'
import type { MessagesProcessorService } from '../services/messages-processor/service.js'

export interface Dependencies {
  config: ConfigService
  logger: ReturnType<typeof makeLogger>
  jobRunner: ReturnType<typeof makeJobRunner>
  executionApi: ExecutionApiService
  messagesProcessor: MessagesProcessorService
}
