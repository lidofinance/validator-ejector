import { z } from 'zod'
import { createSchemaParser } from '../../lib/schema-parser'

const syncingSchema = z.object({
  data: z.object({
    head_slot: z.string(),
    sync_distance: z.string(),
    is_syncing: z.boolean(),
    is_optimistic: z.boolean(),
  }),
})
export const syncingDTO = createSchemaParser(
  syncingSchema,
  'Invalid syncing response'
)

const genesisSchema = z.object({
  data: z.object({
    genesis_time: z.string().nonempty('Invalid genesis_time input'),
    genesis_validators_root: z
      .string()
      .nonempty('Invalid genesis_validators_root input'),
    genesis_fork_version: z
      .string()
      .nonempty('Invalid genesis_fork_version input'),
  }),
})
export const genesisDTO = createSchemaParser(
  genesisSchema,
  'Invalid genesis response'
)

const stateSchema = z.object({
  data: z.object({
    previous_version: z.string().nonempty('Invalid previous_version input'),
    current_version: z.string().nonempty('Invalid current_version input'),
    epoch: z.string().nonempty('Invalid epoch input'),
  }),
})
export const stateDTO = createSchemaParser(
  stateSchema,
  'Invalid state response'
)

const specSchema = z.object({
  data: z.object({
    CAPELLA_FORK_VERSION: z
      .string()
      .nonempty('Invalid CAPELLA_FORK_VERSION input'),
  }),
})
export const specDTO = createSchemaParser(specSchema, 'Invalid spec response')

const depositContractSchema = z.object({
  data: z.object({
    chain_id: z.number({
      invalid_type_error: 'Invalid chain_id input',
    }),
    address: z.string().nonempty('Invalid address input'),
  }),
})
export const depositContractDTO = createSchemaParser(
  depositContractSchema,
  'Invalid spec response'
)

const validatorInfoSchema = z.object({
  data: z.object({
    index: z.string().nonempty('Invalid validator index'),
    status: z.string().nonempty('Invalid status'),
    validator: z.object({
      pubkey: z.string().nonempty('Invalid pubkey'),
      exit_epoch: z.string().nonempty('Invalid exit epoch'),
    }),
  }),
})
export const validatorInfoDTO = createSchemaParser(
  validatorInfoSchema,
  'Invalid validator info response'
)
