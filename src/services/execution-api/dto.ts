import { z } from 'zod'
import { createSchemaParser } from '../../lib/schema-parser'

const syncingSchema = z.object({
  result: z.boolean(),
})
export const syncingDTO = createSchemaParser(
  syncingSchema,
  'Invalid syncing response'
)

const lastBlockNumberSchema = z.object({
  result: z.object({
    number: z.string().nonempty('Invalid latest block number'),
  }),
})
export const lastBlockNumberDTO = createSchemaParser(
  lastBlockNumberSchema,
  'Invalid LastBlockNumber response'
)

const logsSchema = z.object({
  result: z.array(
    z.object({
      topics: z.array(z.string()),
      data: z.string(),
      blockNumber: z.string(),
      transactionHash: z.string(),
    })
  ),
})
export const logsDTO = createSchemaParser(
  logsSchema,
  'Empty or invalid data for events'
)

const funcSchema = z.object({
  result: z.string(),
})
export const funcDTO = createSchemaParser(
  funcSchema,
  'Invalid function call response'
)

const txSchema = z.object({
  result: z.object({
    from: z.string(),
    gas: z.string(),
    gasPrice: z.string(),
    maxFeePerGas: z.string(),
    maxPriorityFeePerGas: z.string(),
    hash: z.string(),
    input: z.string(),
    nonce: z.string(),
    to: z.string(),
    value: z.string(),
    type: z.string(),
    chainId: z.string(),
    v: z.string(),
    r: z.string(),
    s: z.string(),
  }),
})
export const txDTO = createSchemaParser(
  txSchema,
  'Invalid return for a transaction data call'
)

const genericArrayOfStringsSchema = z.array(z.string())
export const genericArrayOfStringsDTO = createSchemaParser(
  genericArrayOfStringsSchema,
  'Decoded generic function return format is not an array of strings'
)
