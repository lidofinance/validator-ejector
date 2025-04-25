import { test } from 'vitest'
import { serializeErrorWithCause } from './serialize-error'

test('serializeErrorWithCause without cause', () => {
  const error = new Error('Test error')
  const serializedError = serializeErrorWithCause(error)

  expect(serializedError.message).toBe('Test error')
  expect(serializedError.cause).toBeUndefined()
})

test('serializeErrorWithCause with cause', () => {
  const innerError = new Error('Inner error')
  const error = new Error('Test error')
  error.cause = innerError
  const serializedError = serializeErrorWithCause(error)
  const cause = serializedError.cause as Error
  expect(serializedError.message).toBe('Test error')
  expect(cause.message).toBe('Inner error')
})

test('serializeErrorWithCause with deeply nested cause', () => {
  const level3Error = new Error('Level 3 error')
  const level2Error = new Error('Level 2 error')
  level2Error.cause = level3Error
  const level1Error = new Error('Level 1 error')
  level1Error.cause = level2Error

  const serializedError = serializeErrorWithCause(level1Error, 2)

  expect(serializedError.message).toBe('Level 1 error')
  const cause = serializedError.cause as Error
  expect(cause.message).toBe('Level 2 error')
  const cause3 = (cause.cause as Error).cause
  expect(cause3).toBeUndefined()
  const cause2 = level2Error.cause as Error
  expect(cause2.message).toBe('Level 3 error')
})
