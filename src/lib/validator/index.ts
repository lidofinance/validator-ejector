import type { LogLevelsUnion } from '../logger/types'
import { logger } from '../../lib.js'
export class ValidationError extends Error {}

export const make = <T>(
  parseFn: (input: unknown, errorMessage?: string) => T
) => {
  return (str?: unknown, errorMessage?: string) => {
    if (!str) throw new ValidationError(errorMessage || 'Empty value')
    return parseFn(str, errorMessage)
  }
}

export const makeOptional = <T>(
  parseFn: (input: unknown, errorMessage?: string) => T
) => {
  return (str?: unknown, errorMessage?: string) => {
    if (!str) return
    try {
      return parseFn(str, errorMessage)
    } catch (_) {
      if (errorMessage) logger.warn(errorMessage)
      return
    }
  }
}

const _num = (input: unknown, errorMessage?: string) => {
  if (!Number.isNaN(input) && typeof input === 'string')
    return parseFloat(input)
  if (!Number.isNaN(input) && typeof input === 'number') return input
  throw new ValidationError(errorMessage || `Invalid number input: "${input}"`)
}
export const num = make(_num)
export const optional_num = makeOptional(_num)

const _str = (input: unknown, errorMessage?: string) => {
  if (typeof input === 'string') return input
  throw new ValidationError(errorMessage || `Not a string: "${input}"`)
}
export const str = make(_str)
export const optional_str = makeOptional(_str)

const _bool = (input: unknown | boolean, errorMessage?: string) => {
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

const _level_attr = (input: unknown, errorMessage?: string) => {
  const string = str(input)
  if (isLevelAttr(string)) return string
  throw new ValidationError(errorMessage || `Invalid level input: "${input}"`)
}
export const level_attr = make(_level_attr)
export const optional_level_attr = makeOptional(_level_attr)

const _obj = (input: unknown, errorMessage?: string) => {
  if (typeof input === 'object' && !Array.isArray(input) && input !== null) {
    return input as Record<string | number | symbol, unknown>
  }
  throw new ValidationError(errorMessage || `Invalid object input: "${input}"`)
}
export const obj = make(_obj)
export const optional_obj = makeOptional(_obj)

const _arr = (input: unknown, errorMessage?: string) => {
  if (typeof input === 'object' && Array.isArray(input)) {
    return input as unknown[]
  }
  throw new ValidationError(errorMessage || `Invalid array input: "${input}"`)
}
export const arr = make(_arr)
export const optional_arr = makeOptional(_arr)
