import dotenv from 'dotenv'

import { ExitLogsService, makeExitLogsService } from './service.js'

import {
  LoggerService,
  RequestService,
  abort,
  makeLogger,
  makeRequest,
  notOkError,
  retry,
} from '../../lib/index.js'

import { mockConfig } from '../../test/config.js'
import { ConfigService } from '../config/service.js'
import { MetricsService } from 'services/prom/service.js'
import {
  ExecutionApiService,
  makeExecutionApi,
} from '../execution-api/service.js'

dotenv.config()

describe('exitLogs e2e', () => {
  let api: ExitLogsService
  let executionApi: ExecutionApiService
  let request: RequestService
  let logger: LoggerService
  let config: ConfigService

  const metrics = {
    eventSecurityVerification: {
      inc: vi.fn(),
    },
  } as unknown as MetricsService

  const loadServices = () => {
    executionApi = makeExecutionApi(request, logger, config)

    api = makeExitLogsService(logger, executionApi, config, metrics)
  }

  beforeEach(async () => {
    request = makeRequest([retry(3), notOkError(), abort(30_000)])
    logger = makeLogger({
      level: 'info',
      format: 'simple',
    })
    config = mockConfig(logger, {
      EXECUTION_NODE: 'https://ethereum-rpc.publicnode.com',
      CONSENSUS_NODE: 'https://ethereum-beacon-api.publicnode.com',
      ORACLE_ADDRESSES_ALLOWLIST: JSON.stringify([
        '0x140Bd8FbDc884f48dA7cb1c09bE8A2fAdfea776E',
        '0xA7410857ABbf75043d61ea54e07D57A6EB6EF186',
        '0x404335BcE530400a5814375E7Ec1FB55fAff3eA2',
        '0x946D3b081ed19173dC83Cd974fC69e1e760B7d78',
        '0x007DE4a5F7bc37E2F26c0cb2E8A95006EE9B89b5',
        '0xc79F702202E3A6B0B6310B537E786B9ACAA19BAf',
        '0x61c91ECd902EB56e314bB2D5c5C07785444Ea1c8',
        '0xe57B3792aDCc5da47EF4fF588883F0ee0c9835C9',
        '0x73181107c8D9ED4ce0bbeF7A0b4ccf3320C41d12',
      ]),
      OPERATOR_IDENTIFIERS: JSON.stringify([0]),
      BLOCKS_PRELOAD: 1,
      STAKING_MODULE_ID: '1',
      DRY_RUN: true,
      LOCATOR_ADDRESS: '0xC1d0b3DE6792Bf6b4b37EccdcC24e45978Cfd2Eb',
    })
    loadServices()
  })

  it('should fetch and parse exit logs correctly from multiple blocks', async () => {
    const startBlock = 22024255
    const frame1Block = 22044254
    const frame2Block = 22064254

    config.BLOCKS_PRELOAD = frame1Block - startBlock

    loadServices()

    await executionApi.resolveExitBusAddress()
    await executionApi.resolveConsensusAddress()

    const frame1 = await api.getLogs([0], frame1Block)

    expect(frame1.length).toBe(20)

    const frame2 = await api.getLogs([0], frame2Block)

    expect(frame2.length).toBe(42)
  })

  it('should fetch and parse exit logs correctly from multiple blocks and multiple operators', async () => {
    const startBlock = 22024255
    const frame1Block = 22044254
    const frame2Block = 22064254

    config.BLOCKS_PRELOAD = frame1Block - startBlock

    loadServices()

    await executionApi.resolveExitBusAddress()
    await executionApi.resolveConsensusAddress()

    const frame1 = await api.getLogs([0, 1, 2], frame1Block)

    expect(frame1.length).toBe(40)

    const frame2 = await api.getLogs([0, 1], frame2Block)

    expect(frame2.length).toBe(62)
  })
})
