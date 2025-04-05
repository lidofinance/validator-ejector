import fs from 'fs/promises'
import jwt from 'jsonwebtoken'
import { makeLogger } from 'lido-nanolib'

export type JwtService = ReturnType<typeof makeJwtService>

export const makeJwtService = (
  logger: ReturnType<typeof makeLogger>,
  { JWT_SECRET_PATH }: { JWT_SECRET_PATH: string }
) => {
  // Store loaded secret and token
  let secretBuffer: Buffer | null = null
  let token: string | null = null

  // Initialize function, called at application startup
  const initialize = async () => {
    try {
      if (!JWT_SECRET_PATH) {
        logger.info('JWT_SECRET_PATH not configured, skipping JWT initialization')
        return false
      }
      
      // Read hex format secret
      const hexSecret = await fs.readFile(JWT_SECRET_PATH, 'utf8')
      // Convert hex to buffer
      secretBuffer = Buffer.from(hexSecret.trim(), 'hex')
      // Create payload with current timestamp
      const payload = { iat: Math.floor(Date.now() / 1000) }
      // Sign using buffer
      token = jwt.sign(payload, secretBuffer, { algorithm: 'HS256' })
      
      logger.info('JWT token initialized successfully')
      return true
    } catch (error) {
      logger.error('Failed to initialize JWT token', error)
      throw new Error('Unable to initialize JWT token, ensure JWT_SECRET_PATH is configured correctly')
    }
  }

  // Get token, returns null if not initialized
  const getToken = () => {
    return token
  }

  return {
    initialize,
    getToken
  }
} 
