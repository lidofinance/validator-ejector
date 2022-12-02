const colorTable = {
  debug: '\x1b[32m', // green
  info: '\x1b[32m', // green
  log: '\x1b[36m', // cyan
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
}

const white = '\x1b[0m'

const on = (l: number) => String(l).padStart(2, '0')

export const dateFormat = (ts: number) => {
  const d = new Date(ts * 1000)
  return `${d.getFullYear()}-${on(d.getMonth() + 1)}-${on(d.getDate())} ${on(
    d.getHours()
  )}:${on(d.getMinutes())}:${on(d.getSeconds())}`
}

export const printer = {
  json<T>(target: T, level: string) {
    console[level](JSON.stringify(target))
  },
  simple<T extends { message: string; details?: any; timestamp: number }>(
    target: T,
    level: string
  ) {
    const { message, ...rest } = target
    let printing = `${white}${dateFormat(rest.timestamp)}${
      colorTable[level]
    } ${level}${white}:${colorTable[level]} ${message}${white}`
    if (rest.details) printing += ` ${JSON.stringify(rest.details)}`
    console[level](printing)
  },
}
