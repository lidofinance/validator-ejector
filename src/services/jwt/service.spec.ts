import { describe, beforeEach, test, expect, vi } from 'vitest'
import { makeJwtService } from './service.js'
import { mockLogger } from '../../test/logger.js'
import fs from 'fs/promises'
import jwt from 'jsonwebtoken'

// Mock fs and jwt modules
vi.mock('fs/promises')
vi.mock('jsonwebtoken')

let logger = mockLogger()

describe('jwt service', () => {
  beforeEach(() => {
    logger = mockLogger()
    vi.clearAllMocks()
  })

  test('initialize without JWT_SECRET_PATH', async () => {
    const jwtService = makeJwtService(logger, { JWT_SECRET_PATH: '' })

    const result = await jwtService.initialize()

    expect(result).toBe(false)
    expect(logger.info).toHaveBeenCalledWith(
      'JWT_SECRET_PATH not configured, skipping JWT initialization'
    )
  })

  test('initialize with valid JWT_SECRET_PATH', async () => {
    const mockSecretHex = '0123456789abcdef'

    // Mock successful file read
    vi.mocked(fs.readFile).mockResolvedValue(mockSecretHex)

    const jwtService = makeJwtService(logger, {
      JWT_SECRET_PATH: '/valid/path',
    })

    const result = await jwtService.initialize()

    expect(result).toBe(true)
    expect(fs.readFile).toHaveBeenCalledWith('/valid/path', 'utf8')
    expect(logger.info).toHaveBeenCalledWith('JWT secret loaded successfully')
  })

  test('initialize with invalid JWT_SECRET_PATH', async () => {
    // Mock file read error
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

    const jwtService = makeJwtService(logger, {
      JWT_SECRET_PATH: '/invalid/path',
    })

    await expect(jwtService.initialize()).rejects.toThrow(
      'Unable to load JWT secret, ensure JWT_SECRET_PATH is configured correctly'
    )
    expect(logger.error).toHaveBeenCalled()
  })

  test('generateToken after successful initialization', async () => {
    const mockSecretHex = '0123456789abcdef'
    const mockToken = 'jwt.token.here'

    // Mock successful file read
    vi.mocked(fs.readFile).mockResolvedValue(mockSecretHex)

    // Mock JWT sign function - this was missing
    vi.mocked(jwt.sign).mockReturnValue(mockToken as any)

    const jwtService = makeJwtService(logger, {
      JWT_SECRET_PATH: '/valid/path',
    })

    await jwtService.initialize()
    const token = jwtService.generateToken()

    expect(token).toBe(mockToken)
    expect(jwt.sign).toHaveBeenCalled()
    // Verify the first argument is an object with iat
    expect(vi.mocked(jwt.sign).mock.calls[0][0]).toHaveProperty('iat')
    // Verify the algorithm is HS256
    expect(vi.mocked(jwt.sign).mock.calls[0][2]).toEqual({
      algorithm: 'HS256',
    })
  })

  test('generateToken without initialization', () => {
    const jwtService = makeJwtService(logger, {
      JWT_SECRET_PATH: '/valid/path',
    })

    const token = jwtService.generateToken()

    expect(token).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(
      'JWT secret not initialized, unable to generate token'
    )
  })
})
