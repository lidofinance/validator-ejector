import type { Sanitizer } from './types'

// Escape a string so a RegExp matches it literally
const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// How a string looks inside a JSON document: special characters escaped
// (`\n` -> `\\n`), without the surrounding quotes
const jsonEscape = (value: string) => JSON.stringify(value).slice(1, -1)

// A secret shows up in a log line not only verbatim but also JSON-escaped,
// when a serialized payload is logged as a plain string or serialized again.
// So every secret is searched for in three forms: raw, escaped,
// double-escaped.
const ESCAPE_LEVELS = 3

const collectVariants = (secrets: string[]) => {
  const variants = new Set<string>()
  for (const secret of secrets) {
    if (typeof secret !== 'string') continue
    // The trimmed form covers secrets read from env with stray whitespace
    for (let variant of [secret, secret.trim()]) {
      for (let level = 0; variant && level < ESCAPE_LEVELS; level++) {
        variants.add(variant)
        variant = jsonEscape(variant)
      }
    }
  }
  return variants
}

export const sanitize = (input: string, sanitizer: Sanitizer) => {
  const variants = collectVariants(sanitizer.secrets)
  if (variants.size === 0) return input

  // Longest variant first, so an overlapping shorter secret cannot shadow a
  // longer one; the function replacer keeps `$` in the replacement literal
  const longestFirst = [...variants].sort((a, b) => b.length - a.length)
  const pattern = new RegExp(longestFirst.map(escapeRegExp).join('|'), 'g')
  return input.replace(pattern, () => sanitizer.replacer)
}

// JSON.parse's reviver visits values only, never keys, so objects are
// rebuilt with each key sanitized by hand
const sanitizeKeys = (
  object: Record<string, unknown>,
  sanitizer: Sanitizer
) => {
  // Null prototype so a key like `__proto__` becomes an own property
  // instead of hitting the inherited setter and getting lost
  const result: Record<string, unknown> = Object.create(null)
  for (const [key, value] of Object.entries(object)) {
    result[sanitize(key, sanitizer)] = value
  }
  return result
}

export const stringify = (object: unknown, sanitizer: Sanitizer) => {
  let message = ''

  try {
    // Sanitize value by value, not the serialized string as a whole: a match
    // against the final JSON could hit a secret across an escape boundary
    // (e.g. secret `nabc` inside `"\nabc"`) and corrupt the output
    const sanitized = JSON.parse(JSON.stringify(object), (_, value) => {
      if (typeof value === 'string') return sanitize(value, sanitizer)
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return sanitizeKeys(value, sanitizer)
      }
      return value
    })
    message = JSON.stringify(sanitized)
  } catch (error) {}

  return message
}
