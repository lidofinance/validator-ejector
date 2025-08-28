import fs from 'fs/promises'
import jwt from 'jsonwebtoken'
import { LoggerService } from '../../lib/index.js'

export type JwtService = ReturnType<typeof makeJwtService>

export const makeJwtService = (
  logger: LoggerService,
  { JWT_SECRET_PATH }: { JWT_SECRET_PATH: string }
) => {
  // Store loaded secret
  let secretBuffer: Buffer | null = null

  // Initialize function, called at application startup
  const initialize = async () => {
    try {
      if (!JWT_SECRET_PATH) {
        logger.info(
          'JWT_SECRET_PATH not configured, skipping JWT initialization'
        )
        return false
      }

      // Read hex format secret
      const hexSecret = await fs.readFile(JWT_SECRET_PATH, 'utf8')
      const cleanHexSecret = hexSecret.trim().replace(/^0x/, '')

      // Validate hex format
      if (!/^[0-9a-fA-F]+$/.test(cleanHexSecret)) {
         throw new Error(`Invalid hex format in JWT secret file: ${JWT_SECRET_PATH}`)
      }

      // Convert hex to buffer
      secretBuffer = Buffer.from(cleanHexSecret, 'hex')
      logger.debug(`JWT secret loaded: ${cleanHexSecret.length} hex characters, ${secretBuffer.length} bytes`)

      logger.info('JWT secret loaded successfully')
      return true
    } catch (error) {
      logger.error('Failed to load JWT secret', error)
      throw new Error(
        'Unable to load JWT secret, ensure JWT_SECRET_PATH is configured correctly'
      )
    }
  }

  // Generate a new token for each request with current timestamp
  const generateToken = () => {
    if (!secretBuffer) {
      logger.warn('JWT secret not initialized, unable to generate token')
      return null
    }
    
    try {
      // Create payload with current timestamp
      const payload = { iat: Math.floor(Date.now() / 1000) }
      // Sign using buffer
      const token = jwt.sign(payload, secretBuffer, { algorithm: 'HS256' })
      logger.debug('JWT token generated successfully')
      return token
    } catch (error) {
      logger.error('Failed to generate JWT token', error)
      return null
    }
  }

  return {
    initialize,
    generateToken,
  }
}
