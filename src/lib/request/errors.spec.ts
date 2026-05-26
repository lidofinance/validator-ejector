import { HttpException } from './errors.js'

describe('HttpException', () => {
  it('uses string response as Error.message', () => {
    const error = new HttpException('boom', 503)

    expect(error.message).toBe('boom')
    expect(error.response).toBe('boom')
    expect(error.statusCode).toBe(503)
  })

  it('uses response.message as Error.message', () => {
    const error = new HttpException({ message: 'bad request' }, 400)

    expect(error.message).toBe('bad request')
    expect(error.response).toEqual({ message: 'bad request' })
    expect(error.statusCode).toBe(400)
  })

  it('falls back to status when response has no message', () => {
    const error = new HttpException({ error: 'bad request' }, 400)

    expect(error.message).toBe('HTTP request failed with status 400')
    expect(error.response).toEqual({ error: 'bad request' })
    expect(error.statusCode).toBe(400)
  })
})
