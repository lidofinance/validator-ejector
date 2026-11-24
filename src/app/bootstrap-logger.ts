import { makeLogger } from '../lib/index.js'
import { makeLoggerConfig } from '../services/config/service.js'

// Fatal startup errors must pass through the same sanitizer as the
// application logger: dependency errors escaping makeAppModule can carry
// capability-bearing URLs and passwords in nested causes. If the logger
// configuration itself cannot be resolved, this throws and the process dies
// on that error — never run with an unsanitized logger
export const makeBootstrapLogger = (env: NodeJS.ProcessEnv) => {
  const { LOGGER_LEVEL, LOGGER_FORMAT, LOGGER_SECRETS } = makeLoggerConfig({
    env,
  })
  return makeLogger({
    level: LOGGER_LEVEL,
    format: LOGGER_FORMAT,
    sanitizer: {
      secrets: LOGGER_SECRETS,
      replacer: '<secret>',
    },
  })
}
