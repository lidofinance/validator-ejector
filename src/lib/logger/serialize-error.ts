export function serializeErrorWithCause(
  error: unknown,
  maxDepth = 5,
  currentDepth = 0
): Record<string, unknown> {
  if (!(error instanceof Error)) return {}
  if (currentDepth >= maxDepth) {
    return { message: 'Max depth reached' }
  }

  const serializedError: Record<string, unknown> = {
    ...error,
    message: error.message,
    name: error.name,
    stack: error.stack,
  }

  if (error instanceof AggregateError) {
    serializedError.errors = error.errors.map((err) =>
      serializeErrorWithCause(err, maxDepth, currentDepth + 1)
    )
  }

  if (error.cause) {
    serializedError.cause = serializeErrorWithCause(
      error.cause,
      maxDepth,
      currentDepth + 1
    )
  }

  return serializedError
}
