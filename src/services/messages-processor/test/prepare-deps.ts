import dotenv from 'dotenv'
import { makeLogger, makeRequest } from 'lido-nanolib'
import { logger as loggerMiddleware, retry, abort, prom } from 'lido-nanolib'
import {
  makeConfig,
  makeLoggerConfig,
} from '../../../services/config/service.js'
import { makeConsensusApi } from '../../../services/consensus-api/service.js'
import { makeMetrics } from '../../../services/prom/service.js'
import { makeForkVersionResolver } from '../../../services/fork-version-resolver/service.js'
import {
  MessageFile,
  makeLocalFileReader,
} from '../../../services/local-file-reader/service.js'
import { makeS3Store } from '../../../services/s3-store/service.js'
import { makeGsStore } from '../../../services/gs-store/service.js'
import { makeMessagesProcessor } from '../../../services/messages-processor/service.js'
import { MessageStorage } from '../../../services/job-processor/message-storage.js'
import {
  depositContractMock,
  genesisMock,
  stateMock,
  validatorInfoMock,
} from './fixtures.js'
import nock from 'nock'

dotenv.config()

const mockEthCLNode = (
  res: { url: string; method: string; result: any },
  clNode: string
): [string, () => boolean] => {
  const interceptor = nock(clNode).get(res.url)
  interceptor.reply(200, res.result).persist()

  return [res.url, () => nock.removeInterceptor(interceptor)]
}

const metrics = makeMetrics({ PREFIX: `PROM_TEST` })

export const prepareDeps = (
  messages: MessageFile[],
  validator: { pubKey: string; id: string },
  fork: {
    previous_version: string
    current_version: string
    epoch: string
  }
) => {
  const loggerConfig = makeLoggerConfig({ env: process.env })

  const logger = makeLogger({
    level: 'error',
    format: loggerConfig.LOGGER_FORMAT,
    sanitizer: {
      secrets: loggerConfig.LOGGER_SECRETS,
      replacer: '<secret>',
    },
  })

  const config = makeConfig({ logger, env: process.env })

  const serverMocks = [
    mockEthCLNode(depositContractMock('17000'), config.CONSENSUS_NODE),
    mockEthCLNode(stateMock(fork), config.CONSENSUS_NODE),
    mockEthCLNode(validatorInfoMock(validator), config.CONSENSUS_NODE),
    mockEthCLNode(genesisMock(), config.CONSENSUS_NODE),
  ]

  const consensusApi = makeConsensusApi(
    makeRequest([
      retry(3),
      loggerMiddleware(logger),
      prom(metrics.consensusRequestDurationSeconds),
      abort(30_000),
    ]),
    logger,
    config
  )

  const forkVersionResolver = makeForkVersionResolver(consensusApi, logger)

  const localFileReader = makeLocalFileReader({ logger })

  vi.spyOn(localFileReader, 'readFilesFromFolder').mockImplementation(
    async () => messages
  )

  const s3Service = makeS3Store({ logger })
  const gsService = makeGsStore({ logger })

  const messagesProcessor = makeMessagesProcessor({
    logger,
    config,
    localFileReader,
    consensusApi,
    metrics,
    s3Service,
    gsService,
  })

  const infoLogger = makeLogger({
    level: 'info',
    format: loggerConfig.LOGGER_FORMAT,
    sanitizer: {
      secrets: loggerConfig.LOGGER_SECRETS,
      replacer: '<secret>',
    },
  })

  const messageStorage = new MessageStorage()

  const restore = (url?: string) => {
    serverMocks.map(([fnUrl, fn]) => {
      if (!url) return fn()
      if (fnUrl === url) return fn()
    })
  }

  const changeForkState = (fork: {
    previous_version: string
    current_version: string
    epoch: string
  }) => {
    restore('/eth/v1/beacon/states/finalized/fork')
    mockEthCLNode(stateMock(fork), config.CONSENSUS_NODE)
  }

  return {
    messagesProcessor,
    logger: infoLogger,
    forkVersionResolver,
    messageStorage,
    restore,
    changeForkState,
  }
}
