import { ValidationError, ValidationEmptyError } from './errors.js'

export const optional = <T>(cb: () => T) => {
  try {
    return cb()
  } catch (error) {
    if (error instanceof ValidationEmptyError) return
    throw error
  }
}

export const wrap = <T>(input: unknown, cb: () => T, errorMessage?: string) => {
  try {
    return cb()
  } catch (error) {
    throw new ValidationError(errorMessage || error.message, input)
  }
}

export const or = <Left, Right>(left: () => Left, right: () => Right) => {
  let result: Left | Right | undefined
  let leftError: ValidationError | undefined
  let rightError: ValidationError | undefined
  try {
    result = left()
  } catch (error) {
    leftError = error
  }

  try {
    result = right()
  } catch (error) {
    rightError = error
  }
  if ((leftError && rightError) || !result)
    throw new ValidationError(
      leftError?.message || rightError?.message || 'OR runtime error'
    )
  return result
}

type Fn<T> = (arg: T) => T
type Chain<T> = Fn<T>[]

export const pipe = <T>(arg: T, ...fns: Chain<T>) =>
  fns.reduce((acc, fn) => fn(acc), arg)

export const min_length =
  (len: number, errorMessage?: string) =>
  <T>(arg: string | unknown[]): T => {
    if (arg.length > len)
      throw new ValidationError(errorMessage || 'Invalid length')
    return arg as T
  }
