import type { JobRunnerService, LoggerService } from 'lido-nanolib'
import type { ExecutionApiService } from '../services/execution-api/service.js'
import type { ConfigService } from '../services/config/service.js'
import type { MessagesProcessorService } from '../services/messages-processor/service.js'

export interface Dependencies {
  config: ConfigService
  logger: LoggerService
  job: JobRunnerService
  executionApi: ExecutionApiService
  messagesProcessor: MessagesProcessorService
}
