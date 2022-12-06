import { LoggerModule, LOG_LEVELS } from 'tooling-nanolib-test'
import { makeConfig } from './index.js'
import { jest } from '@jest/globals'

// interface Dict<T> {
//   [key: string]: T | undefined
// }

let logger = LOG_LEVELS.reduce((acc, level) => {
  acc[level] = jest.fn()
  return acc
}, {}) as LoggerModule

describe('config module', () => {
  beforeEach(() => {
    logger = LOG_LEVELS.reduce((acc, level) => {
      acc[level] = jest.fn()
      return acc
    }, {}) as LoggerModule
  })
  test('invalid config', () => {
    const env = {} as NodeJS.ProcessEnv

    const makeConf = () => makeConfig({ logger, env })

    expect(makeConf).toThrow()
  })
})
