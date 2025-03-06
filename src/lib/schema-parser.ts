import { z } from 'zod'

/**
 * A universal schema parser that handles Zod schema validation with consistent error handling
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @param errorPrefix - Optional error message prefix
 * @returns The parsed and validated data with proper typing
 */
export function parseSchema<T extends z.ZodType>(
  schema: T,
  data: unknown,
  errorPrefix?: string
): z.infer<T> {
  try {
    return schema.parse(data)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(
      errorPrefix ? `${errorPrefix}: ${errorMessage}` : errorMessage
    )
  }
}

/**
 * Creates a parser function with a predefined error message
 *
 * @param schema - The Zod schema to validate against
 * @param errorPrefix - The error message prefix
 * @returns A function that validates data against the schema
 */
export function createSchemaParser<T extends z.ZodType>(
  schema: T,
  errorPrefix: string
): (data: unknown) => z.infer<T> {
  return (data: unknown) => parseSchema(schema, data, errorPrefix)
}
