const colorTable = {
  debug: '\x1b[32m', // green
  info: '\x1b[32m', // green
  log: '\x1b[36m', // cyan
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
}

const white = '\x1b[0m'

const timestampFormat = (ts: number) => {
  const d = new Date(ts * 1000)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
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
    console[level](
      `${white}${timestampFormat(rest.timestamp)}${
        colorTable[level]
      } ${level}${white}:${colorTable[level]} ${message}${white}`
    )
    if (rest.details) {
      console[level](JSON.stringify(rest.details, null, 2), white)
    }
  },
}
