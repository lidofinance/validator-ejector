import fs from 'fs'
import jwt from 'jsonwebtoken'
import { makeLogger } from 'lido-nanolib'

export type JwtService = ReturnType<typeof makeJwtService>

export const makeJwtService = (
  logger: ReturnType<typeof makeLogger>,
  { JWT_SECRET_PATH }: { JWT_SECRET_PATH: string }
) => {
  const generateToken = () => {
    try {
      // read the secret from the file
      const hexSecret = fs.readFileSync(JWT_SECRET_PATH, 'utf8').trim()
      // convert the hex to a buffer
      const secretBuffer = Buffer.from(hexSecret, 'hex')
      // create a payload with the current timestamp
      const payload = { iat: Math.floor(Date.now() / 1000) }
      // sign the payload with the secret
      return jwt.sign(payload, secretBuffer, { algorithm: 'HS256' })
    } catch (error) {
      logger.error('Unable to generate JWT token', error)
      throw new Error('Unable to generate JWT token')
    }
  }

  return {
    generateToken
  }
} 
