import { LoggerService } from 'lido-nanolib'
import { makeConfig } from '../services/config/service.js'

export const configBase = {
  EXECUTION_NODE: 'someurl',
  CONSENSUS_NODE: 'someurl',
  LOCATOR_ADDRESS: '0x12cd349E19Ab2ADBE478Fc538A66C059Cf40CFeC',
  STAKING_MODULE_ID: '123',
  OPERATOR_ID: '123',
  BLOCKS_PRELOAD: 10000,
  ORACLE_ADDRESSES_ALLOWLIST: '["0x123","0x12345"]',
  HTTP_PORT: 8080,
  RUN_METRICS: true,
  RUN_HEALTH_CHECK: true,
  DRY_RUN: true,
  LOGGER_LEVEL: 'debug',
  LOGGER_PRETTY: true,
}

export const defaultConfig = {
  ...configBase,
  MESSAGES_LOCATION: '/null',
}

export const mockConfig = <T>(logger: LoggerService, configObject?: T) =>
  makeConfig({
    logger,
    env: { ...defaultConfig, ...configObject } as unknown as NodeJS.ProcessEnv,
  })
