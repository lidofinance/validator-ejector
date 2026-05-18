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

const httpExceptionMessage = (
  response: string | Record<string, any>,
  status: number
) => {
  if (typeof response === 'string') return response
  if (typeof response.message === 'string') return response.message
  return `HTTP request failed with status ${status}`
}
