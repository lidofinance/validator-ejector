import { ExitLogsService, makeExitLogsService } from './service.js'
import { LoggerService } from '../../lib/index.js'
import { mockLogger } from '../../test/logger.js'
import { mockConfig } from '../../test/config.js'
import { ConfigService } from '../config/service.js'
import { MetricsService } from 'services/prom/service.js'
import { ExecutionApiService } from '../execution-api/service.js'

// Create mock instances that we can configure per test
const mockCache = {
  getHeader: vi.fn(() => ({ startBlock: 0, endBlock: -1 })),
  getAll: vi.fn(),
  push: vi.fn(),
  setHeader: vi.fn(),
}

const mockFetcher = {
  getLogs: vi.fn(),
}

// Mock cache implementation
vi.mock('./cache.js', () => ({
  makeExitLogsCacheService: vi.fn(() => mockCache),
}))

// Mock fetcher implementation
vi.mock('./fetcher.js', () => ({
  makeExitLogsFetcherService: vi.fn(() => mockFetcher),
}))

// Mock verifier implementation
vi.mock('./verifier.js', () => ({
  makeVerifier: vi.fn(() => ({
    verify: vi.fn(),
  })),
}))

describe('ExitLogsService - getLogs', () => {
  let service: ExitLogsService
  let logger: LoggerService
  let config: ConfigService
  let el: ExecutionApiService
  let metrics: MetricsService

  const makeTestingService = () => {
    el = {
      exitBusAddress: '0x0',
      consensusAddress: '0x0',
      getBlockNumber: vi.fn(),
      getExitBusEvents: vi.fn(),
      getTx: vi.fn(),
    } as unknown as ExecutionApiService

    metrics = {
      eventSecurityVerification: {
        inc: vi.fn(),
      },
    } as unknown as MetricsService

    // Reset all mocks before each test
    vi.clearAllMocks()

    // Create the service with the mocked dependencies
    service = makeExitLogsService(logger, el, config, metrics)
  }

  beforeEach(() => {
    logger = mockLogger()
    config = mockConfig(logger, {
      BLOCKS_PRELOAD: 5000,
      STAKING_MODULE_ID: '1',
      ORACLE_ADDRESSES_ALLOWLIST: JSON.stringify(['0x123']),
      TRUST_MODE: false,
    })

    makeTestingService()
  })

  it('should return cached logs if data is fully cached', async () => {
    // Setup mocks for this test
    const cachedLogs = [
      { validatorIndex: '1', validatorPubkey: '0x123' },
      { validatorIndex: '2', validatorPubkey: '0x456' },
    ]

    mockCache.getHeader.mockReturnValue({ startBlock: 0, endBlock: 100 })
    mockCache.getAll.mockReturnValue(cachedLogs)

    // Call getLogs with the same lastBlockNumber as cached
    const result = await service.getLogs([1], 100)

    // Verify that we just returned cached data without fetching
    expect(result).toBe(cachedLogs)
    expect(mockCache.getAll).toHaveBeenCalledTimes(1)
    expect(mockFetcher.getLogs).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith(
      'Using cached logs up to block 100'
    )
  })

  it('should fetch new logs when cache is empty', async () => {
    // Setup mocks for empty cache
    mockCache.getHeader.mockReturnValue({ startBlock: 0, endBlock: -1 })
    mockCache.getAll.mockReturnValue([])

    const fetchedLogs = [{ validatorIndex: '1', validatorPubkey: '0x123' }]
    mockFetcher.getLogs.mockResolvedValue(fetchedLogs)
    const lastBlockNumber = 100
    await service.getLogs([1], lastBlockNumber)

    expect(mockFetcher.getLogs).toHaveBeenCalledWith(0, lastBlockNumber, [1])
    expect(mockCache.push).toHaveBeenCalled()
    expect(mockCache.setHeader).toHaveBeenCalled()
  })

  it('should fetch logs in chunks when range exceeds LOAD_LOGS_STEP', async () => {
    // Define a large range that will require multiple chunks
    const startBlock = 5000
    const endBlock = 25001 // This will require multiple chunks with LOAD_LOGS_STEP = 10000

    // Override BLOCKS_PRELOAD to set our desired range
    config.BLOCKS_PRELOAD = endBlock - startBlock

    makeTestingService()

    mockCache.getHeader.mockReturnValue({ startBlock: 0, endBlock: -1 })
    mockCache.getAll.mockReturnValue([])

    const fetchedLogs = [{ validatorIndex: '1', validatorPubkey: '0x123' }]
    mockFetcher.getLogs.mockResolvedValue(fetchedLogs)

    await service.getLogs([1], endBlock)

    // Should call fetcher.logs 3 times for the chunks:
    // 1. 5000 to 14999
    // 2. 15000 to 24999
    // 3. 25000 to 25001
    expect(mockFetcher.getLogs).toHaveBeenCalledTimes(3)
    expect(mockFetcher.getLogs).toHaveBeenNthCalledWith(1, 5000, 14999, [1])
    expect(mockFetcher.getLogs).toHaveBeenNthCalledWith(2, 15000, 24999, [1])
    expect(mockFetcher.getLogs).toHaveBeenNthCalledWith(3, 25000, 25001, [1])
  })

  it('should fetch only new logs when cache is partially updated', async () => {
    // Setup mocks for partially updated cache
    mockCache.getHeader.mockReturnValue({ startBlock: 0, endBlock: 50 })
    mockCache.getAll.mockReturnValue([])

    const fetchedLogs = [{ validatorIndex: '1', validatorPubkey: '0x123' }]
    mockFetcher.getLogs.mockResolvedValue(fetchedLogs)
    await service.getLogs([1], 100)

    // Should fetch only logs from block 51 to 100
    expect(mockFetcher.getLogs).toHaveBeenCalledWith(51, 100, [1])
    expect(logger.info).toHaveBeenCalledWith('Loading new logs from 51 to 100')
  })
})
