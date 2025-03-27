import { stringify, sanitize } from './sanitizer.js'
import { Sanitizer } from './types.js'

const colorTable = {
  debug: '\x1b[34m', // green
  info: '\x1b[32m', // green
  log: '\x1b[36m', // cyan
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
}

const white = '\x1b[0m'

const on = (l: number) => String(l).padStart(2, '0')

export const dateFormat = (ts: number) => {
  const d = new Date(ts * 1000)
  return `${d.getUTCFullYear()}-${on(d.getUTCMonth() + 1)}-${on(
    d.getUTCDate()
  )} ${on(d.getUTCHours())}:${on(d.getUTCMinutes())}:${on(d.getUTCSeconds())}`
}

export const printer = {
  json<T>(target: T, level: string, sanitizer: Sanitizer) {
    console[level](stringify(target, sanitizer))
  },
  simple<T extends { message: string; details?: any; timestamp: number }>(
    target: T,
    level: string,
    sanitizer: Sanitizer
  ) {
    const { message, ...rest } = target
    let printing = `${white}${dateFormat(rest.timestamp)}${
      colorTable[level]
    } ${level}${white}:${colorTable[level]} ${sanitize(
      message,
      sanitizer
    )}${white}`
    if (rest.details) printing += ` ${stringify(rest.details, sanitizer)}`
    console[level](printing)
  },
}
