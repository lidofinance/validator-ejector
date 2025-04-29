import type { Sanitizer } from './types'

export const sanitize = (input: string, sanitizer: Sanitizer) =>
  sanitizer.secrets.reduce<string>((acc, secret) => {
    if (typeof secret === 'string') {
      acc = acc.replaceAll(secret, sanitizer.replacer)
    }

    return acc
  }, input)

export const stringify = (object: unknown, sanitizer: Sanitizer) => {
  let message = ''

  try {
    const jsonString = JSON.stringify(object)
    message = sanitize(jsonString, sanitizer)
  } catch (error) {}

  return message
}
