import { LoggerService } from '../lib/index.js'
import { makeConfig } from '../services/config/service.js'

export const configBase = {
  EXECUTION_NODE: 'http://localhost:4445',
  CONSENSUS_NODE: 'http://localhost:4455',
  LOCATOR_ADDRESS: '0x12cd349E19Ab2ADBE478Fc538A66C059Cf40CFeC',
  STAKING_MODULE_ID: '123',
  OPERATOR_ID: '123',
  BLOCKS_PRELOAD: 10000,
  ORACLE_ADDRESSES_ALLOWLIST: '["0x123","0x12345"]',
  EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST: '["0x123","0x12345"]',
  VOTING_WITHDRAWAL_TRANSACTIONS_ALLOWLIST: '[]',
  EASY_TRACK_ADDRESS: '0xF0211b7660680B49De1A7E9f25C65660F0a13Fea',
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
