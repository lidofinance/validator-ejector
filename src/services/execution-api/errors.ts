export class NodeNotSyncedError extends Error {
  validatedData?: unknown
  constructor(message: string, validatedData?: unknown) {
    super(message)
    this.validatedData = validatedData
  }
}
