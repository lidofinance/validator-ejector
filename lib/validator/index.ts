import { logger } from '../../lib.js'
import type { LogLevelsUnion } from '../logger/types'

export class ValidationError extends Error {}

export const make = <T>(
  parseFn: (input: string, errorMessage?: string) => T
) => {
  return (str?: string, errorMessage?: string) => {
    try {
      if (!str) throw new ValidationError(errorMessage || 'Empty value')
      return parseFn(str, errorMessage)
    } catch (error) {
      logger.warn(error.message)
      process.exit(1)
    }
  }
}

export const makeOptional = <T>(parseFn: (input: string) => T) => {
  return (str?: string, errorMessage?: string) => {
    if (!str) return
    return make(parseFn)(str, errorMessage)
  }
}

const _num = (input: string, errorMessage?: string) => {
  const coerced = parseFloat(input)
  if (Number.isNaN(coerced))
    throw new ValidationError(
      errorMessage || `Invalid number input: "${input}"`
    )
  return coerced
}
export const num = make(_num)
export const optional_num = makeOptional(_num)

const _str = (input: string, errorMessage?: string) => {
  if (typeof input === 'string') return input
  throw new ValidationError(errorMessage || `Not a string: "${input}"`)
}
export const str = make(_str)
export const optional_str = makeOptional(_str)

const _bool = (input: string | boolean, errorMessage?: string) => {
  switch (input) {
    case true:
    case 'true':
      return true
    case false:
    case 'false':
      return false
    default:
      throw new ValidationError(
        errorMessage || `Invalid bool input: "${input}"`
      )
  }
}
export const bool = make(_bool)
export const optional_bool = makeOptional(_bool)

const isLevelAttr = (input: string): input is LogLevelsUnion =>
  ['debug', 'info', 'log', 'warn', 'error'].includes(input)

const _level_attr = (
  input: string,
  errorMessage?: string
) => {
  if (isLevelAttr(input)) return input
  throw new ValidationError(errorMessage || `Invalid level input: "${input}"`)
}
export const level_attr = make(_level_attr)
export const optional_level_attr = makeOptional(_level_attr)
