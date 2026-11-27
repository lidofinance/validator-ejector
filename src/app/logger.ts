import { makeLogger } from '../lib/index.js'
import {
  makeLoggerConfig,
  resolveAutomaticLoggerSecrets,
} from '../services/config/service.js'

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
// logger config falls back to a JSON logger that masks the values of the
// secret env vars: the error it prints names a variable, a level or a format,
// and an invalid LOGGER_SECRETS error carries no value (see loggerSecrets in
// the config service).
export const makeStartupLogger = (env: NodeJS.ProcessEnv) => {
  try {
    return makeAppLogger(env).logger
  } catch {
    return makeLogger({
      level: 'debug',
      format: 'json',
      sanitizer: { secrets: resolveAutomaticLoggerSecrets(env) },
    })
  }
}
