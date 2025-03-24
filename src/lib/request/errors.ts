export class HttpException extends Error {
  statusCode: number
  response: string | Record<string, any>
  constructor(response: string | Record<string, any>, status: number) {
    super()
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
