export class HttpException extends Error {
  statusCode: number
  response: string | Record<string, any>
  constructor(response: string | Record<string, any>, status: number) {
    super(httpExceptionMessage(response, status))
    this.statusCode = status
    this.response = response
    this.initName()
  }
  initName() {
    this.name = this.constructor.name
  }
  getResponse() {
    return this.response
  }
  getStatus() {
    return this.statusCode
  }
}

// Adds the HTTP status to an error that must stay a plain Error: retry and
// fallback treat a plain Error as final, and the request metric reads the
// status from it
export const withStatusCode = <T>(error: T, statusCode: number): T => {
  if (error instanceof Error) Object.assign(error, { statusCode })
  return error
}

const httpExceptionMessage = (
  response: string | Record<string, any>,
  status: number
) => {
  if (typeof response === 'string') return response
  if (typeof response.message === 'string') return response.message
  return `HTTP request failed with status ${status}`
}
