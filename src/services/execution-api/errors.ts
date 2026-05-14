import { HttpException } from '../../lib/request/errors.js'

export class JsonRpcServerError extends HttpException {
  constructor(response: string | Record<string, any>) {
    super(response, 502)
  }
}

export class NodeNotSyncedError extends Error {
  validatedData?: unknown
  constructor(message: string, validatedData?: unknown) {
    super(message)
    this.validatedData = validatedData
  }
}
