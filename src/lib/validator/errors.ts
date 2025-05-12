export class ValidationError extends Error {
  validatedData?: unknown
  constructor(message, validatedData?: unknown) {
    super(message)
    this.validatedData = validatedData
  }
}

export class ValidationEmptyError extends Error {
  validatedData?: unknown
  constructor(message, validatedData?: unknown) {
    super(message)
    this.validatedData = validatedData
  }
}
