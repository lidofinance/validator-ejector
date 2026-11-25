import { makeLogger } from '../lib/index.js'
import { makeLoggerConfig } from '../services/config/service.js'

export const makeAppLogger = (env: NodeJS.ProcessEnv) => {
  const loggerConfig = makeLoggerConfig({ env })

  const logger = makeLogger({
    level: loggerConfig.LOGGER_LEVEL,
    format: loggerConfig.LOGGER_FORMAT,
    sanitizer: {
      secrets: loggerConfig.LOGGER_SECRETS,
    },
  })

  return { logger, loggerConfig }
}

// Start errors use the format and the masks of the app logger. Only an invalid
// logger config falls back to a plain JSON logger: its error names a variable,
// a level or a format, not a secret value.
export const makeStartupLogger = (env: NodeJS.ProcessEnv) => {
  try {
    return makeAppLogger(env).logger
  } catch {
    return makeLogger({ level: 'debug', format: 'json' })
  }
}
