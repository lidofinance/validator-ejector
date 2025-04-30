import * as v from './validators.js'
import { make, makeDeep, makeJson } from './makers.js'
import { ValidationEmptyError, ValidationError } from './errors.js'

export * from './operators.js'
/**
 * Check unknown value is number
 * ```ts
 * const price = num(json.price)
 * ```
 * @param value - unknown number
 * @param {String | undefined} errorMessage - custom error message
 * @returns number
 */
export const num = make(v.num)
/**
 * Check unknown value is string
 * ```ts
 * const user = str(json.user)
 * ```
 * @param value - unknown string
 * @param {String | undefined} errorMessage - custom error message
 * @returns string
 */
export const str = make(v.str)
/**
 * Check unknown value is boolean
 * ```ts
 * const isAdmin = bool(json.isAdmin)
 * ```
 * @param value - unknown boolean
 * @param {String | undefined} errorMessage - custom error message
 * @returns boolean
 */
export const bool = make(v.bool)

export const level_attr = make(v.level_attr)
export const log_format = make(v.log_format)
/**
 * Check unknown value is object
 * ```ts
 * const user = obj(json.user, user => ({name: str(user.name)}))
 * ```
 * @param value - unknown object
 * @param castingCallback - callback for casting unknown object to data structure
 * @param {String | undefined} errorMessage - custom error message
 * @returns object with nested types
 */
export const obj = makeDeep(v.obj)
/**
 * Check unknown value is array
 * ```ts
 * const prices = arr(json.prices, prices => prices.map(num))
 * ```
 * @param value - unknown array
 * @param castingCallback - callback for casting unknown object to data structure
 * @param {String | undefined} errorMessage - custom error message
 * @returns array with nested types
 */
export const arr = makeDeep(v.arr)

/**
 * Check string value is object
 * ```ts
 * const user = json_obj(json.user, user => ({name: str(user.name)}))
 * ```
 * @param value - unknown object
 * @param castingCallback - callback for casting unknown object to data structure
 * @param {String | undefined} errorMessage - custom error message
 * @returns object with nested types
 */
export const json_obj = makeJson(v.obj)
/**
 * Check string value is array
 * ```ts
 * const prices = json_arr(json.prices, prices => prices.map(num))
 * ```
 * @param value - unknown array
 * @param castingCallback - callback for casting unknown object to data structure
 * @param {String | undefined} errorMessage - custom error message
 * @returns array with nested types
 */
export const json_arr = makeJson(v.arr)

type Check<A, B> = A extends B ? A : never

/**
 * Check satisfies input with literal
 * ```ts
 * const name = literal_str('John', 'some unknown string')
 * ```
 * @param expected - expected value
 * @param value - unknown string or number
 * @param {String | undefined} errorMessage - custom error message
 * @returns expected or throw error
 */
export const literal_str = <Expected, Input>(
  expected: Expected,
  input: Input,
  errorMessage?: string | number
): Check<Expected, Input> => {
  if (typeof input === 'undefined')
    throw new ValidationEmptyError(errorMessage, 'Empty value')
  const parsed = str(input)
  if (expected === parsed) return expected as Check<Expected, Input>
  throw new ValidationError(errorMessage || `Invalid literal input: "${input}"`)
}

/**
 * Check satisfies input with literal
 * ```ts
 * const age = literal_num(33, 22)
 * ```
 * @param expected - expected value
 * @param value - unknown string or number
 * @param {String | undefined} errorMessage - custom error message
 * @returns expected or throw error
 */
export const literal_num = <Expected, Input>(
  expected: Expected,
  input: Input,
  errorMessage?: string | number
): Check<Expected, Input> => {
  if (typeof input === 'undefined')
    throw new ValidationEmptyError(errorMessage, 'Empty value')
  const parsed = num(input)
  if (expected === parsed) return expected as Check<Expected, Input>
  throw new ValidationError(errorMessage || `Invalid literal input: "${input}"`)
}
