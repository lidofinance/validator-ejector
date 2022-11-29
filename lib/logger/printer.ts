const colorTable = {
  debug: '\x1b[32m%s\x1b[0m', // green
  info: '\x1b[32m%s\x1b[0m', // green
  log: '\x1b[36m%s\x1b[0m', // cyan
  warn: '\x1b[33m%s\x1b[0m', // yellow
  error: '\x1b[31m%s\x1b[0m', // red
}

export const printer = {
  json<T>(target: T, level: string) {
    console[level](JSON.stringify(target))
  },
  simple<T extends { message: string; details?: any }>(
    target: T,
    level: string
  ) {
    const { message, ...rest } = target
    console[level](colorTable[level], message)
    if (level === 'error') {
      console['warn'](colorTable['warn'], 'Debug details:')
      console['warn'](colorTable['warn'], JSON.stringify(rest, null, 2))
    }
  },
}
