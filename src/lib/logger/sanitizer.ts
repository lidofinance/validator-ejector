import type { Sanitizer } from './types'

// JSON.stringify escapes control characters (a trailing newline read from a
// *_FILE secret, for example), double quotes and backslashes. A secret that
// contains any of them never occurs verbatim in serialized output, so it has
// to be matched in its escaped form as well.
const jsonEscape = (value: string) => JSON.stringify(value).slice(1, -1)

const withJsonEscapedSecrets = (sanitizer: Sanitizer): Sanitizer => ({
  ...sanitizer,
  secrets: Array.from(
    new Set(
      sanitizer.secrets.flatMap((secret) =>
        typeof secret === 'string' ? [secret, jsonEscape(secret)] : []
      )
    )
  ),
})

export const sanitize = (input: string, sanitizer: Sanitizer) =>
  sanitizer.secrets.reduce<string>((acc, secret) => {
    // An empty secret would interleave the replacer between every character
    if (typeof secret === 'string' && secret.length > 0) {
      acc = acc.replaceAll(secret, sanitizer.replacer)
    }

    return acc
  }, input)

export const stringify = (object: unknown, sanitizer: Sanitizer) => {
  let message = ''

  try {
    const jsonString = JSON.stringify(object)
    message = sanitize(jsonString, withJsonEscapedSecrets(sanitizer))
  } catch (error) {}

  return message
}
