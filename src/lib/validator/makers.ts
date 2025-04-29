import { ValidationError, ValidationEmptyError } from './errors.js'

export const make = <T>(
  parseFn: (input: unknown, errorMessage?: string | number) => T
) => {
  return (input?: unknown, errorMessage?: string | number) => {
    if (typeof input === 'undefined')
      throw new ValidationEmptyError(errorMessage, 'Empty value')
    return parseFn(input, errorMessage)
  }
}

export const makeDeep = <T>(
  parseFn: (input: unknown, errorMessage?: string) => T
) => {
  return <B>(input: unknown, cb: (arg: T) => B, errorMessage?: string) => {
    if (typeof input === 'undefined')
      throw new ValidationEmptyError(errorMessage || 'Empty value', input)
    try {
      return cb(parseFn(input, errorMessage))
    } catch (error) {
      throw new ValidationError(error.message, input)
    }
  }
}

export const makeJson = <T>(
  parseFn: (input: unknown, errorMessage?: string) => T
) => {
  return <B>(input: unknown, cb: (arg: T) => B, errorMessage?: string) => {
    if (typeof input === 'undefined')
      throw new ValidationEmptyError(errorMessage || 'Empty value', input)
    if (typeof input !== 'string')
      throw new ValidationError(errorMessage || 'Input must be a string', input)
    try {
      return cb(parseFn(JSON.parse(input), errorMessage))
    } catch (error) {
      throw new ValidationError(error.message, input)
    }
  }
}
