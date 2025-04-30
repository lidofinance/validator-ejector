import { ValidationError } from './errors.js'
import type { Format, LogLevelsUnion } from '../logger/types.js'

export const num = (input: unknown, errorMessage?: string) => {
  if (typeof input === 'string' && !Number.isNaN(Number(input)))
    return parseFloat(input)
  if (typeof input === 'number' && !isNaN(input)) return input
  throw new ValidationError(errorMessage || `Invalid number input: "${input}"`)
}

export const str = (input: unknown, errorMessag?: string | number) => {
  if (typeof input === 'string') return input
  throw new ValidationError(
    typeof errorMessag === 'undefined' || typeof errorMessag === 'number'
      ? `Invalid string input: "${input}"`
      : errorMessag
  )
}

export const bool = (input: unknown | boolean, errorMessage?: string) => {
  switch (input) {
    case true:
    case 'true':
    case 'True':
      return true
    case false:
    case 'false':
    case 'False':
      return false
    default:
      throw new ValidationError(
        errorMessage || `Invalid bool input: "${input}"`
      )
  }
}

const isLevelAttr = (input: string): input is LogLevelsUnion =>
  ['debug', 'info', 'log', 'warn', 'error'].includes(input)

const isLogFormat = (input: string): input is Format =>
  ['json', 'simple'].includes(input)

export const level_attr = (input: unknown, errorMessage?: string) => {
  const string = str(input)
  if (isLevelAttr(string)) return string
  throw new ValidationError(errorMessage || `Invalid level input: "${input}"`)
}

export const log_format = (input: unknown, errorMessage?: string) => {
  const string = str(input)
  if (isLogFormat(string)) return string
  throw new ValidationError(errorMessage || `Invalid level input: "${input}"`)
}

export const obj = (input: unknown, errorMessage?: string) => {
  if (typeof input === 'object' && !Array.isArray(input) && input !== null) {
    return input as Record<string | number | symbol, unknown>
  }
  throw new ValidationError(errorMessage || `Invalid object input: "${input}"`)
}

export const arr = (input: unknown, errorMessage?: string) => {
  if (typeof input === 'object' && Array.isArray(input)) {
    return input as unknown[]
  }
  throw new ValidationError(errorMessage || `Invalid array input: "${input}"`)
}
