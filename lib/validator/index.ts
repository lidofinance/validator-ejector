export class ValidationError extends Error {}

export const make = <T>(parseFn: (input: string) => T) => {
  return (str?: string) => {
    try {
      if (!str) throw new ValidationError('Empty value')
      return parseFn(str)
    } catch (error) {
      // TODO: logger
      console.log(error.message)
      process.exit(1)
    }
  }
}

export const makeOptional = <T>(parseFn: (input: string) => T) => {
  return (str?: string) => {
    if (!str) return
    return make(parseFn)(str)
  }
}

const _num = (input: string) => {
  const coerced = parseFloat(input)
  if (Number.isNaN(coerced))
    throw new ValidationError(`Invalid number input: "${input}"`)
  return coerced
}
export const num = make(_num)
export const optional_num = makeOptional(_num)

const _str = (input: string) => {
  if (typeof input === 'string') return input
  throw new ValidationError(`Not a string: "${input}"`)
}
export const str = make(_str)
export const optional_str = makeOptional(_str)

const _bool = (input: string | boolean) => {
  switch (input) {
    case true:
    case 'true':
      return true
    case false:
    case 'false':
      return false
    default:
      throw new ValidationError(`Invalid bool input: "${input}"`)
  }
}
export const bool = make(_bool)
export const optional_bool = makeOptional(_bool)
