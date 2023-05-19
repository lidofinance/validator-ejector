import nock from 'nock'

type MockParams<T> = {
  url: string
  method: string
  result?: T
  body?: any
}

export const mockEthServer = <T>(
  { url, method, result, body }: MockParams<T>,
  domain: string
) => {
  const nockInstance = nock(domain)
  console.log(domain, url, method, body)
  switch (method) {
    case 'GET':
      nockInstance.get(url).reply(200, result as any)
      break

    case 'POST':
      if (body) {
        nockInstance
          .post(url, (b) => {
            return b.method === body.method
          })
          .reply(200, result as any)
        break
      }
      nockInstance.post(url).reply(200, result as any)
      break
    default:
      throw new Error(`Unsupported method: ${method}`)
  }

  return nockInstance
}
