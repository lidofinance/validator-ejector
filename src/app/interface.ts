import type { JobRunnerService, LoggerService } from 'lido-nanolib'
import type { ConfigService } from '../services/config/service.js'
import type { MessagesProcessorService } from '../services/messages-processor/service.js'
import type { MetricsService } from '../services/prom/service.js'
import type { HttpHandlerService } from 'services/http-handler/service.js'
import type { ExecutionApiService } from 'services/execution-api/service.js'
import type { ConsensusApiService } from 'services/consensus-api/service.js'

export interface Dependencies {
  config: ConfigService
  logger: LoggerService
  job: JobRunnerService
  messagesProcessor: MessagesProcessorService
  metrics: MetricsService
  httpHandler: HttpHandlerService
  executionApi: ExecutionApiService
  consensusApi: ConsensusApiService
}
