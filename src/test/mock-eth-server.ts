import nock from 'nock'

type MockParams<T> = {
  url: string
  method: string
  result?: T
  body?: any
  bodyMatcher?: (body: any) => boolean
}

/**
 * @param url
 * @param method
 * @param result
 * @param body
 * @param {function(string): boolean} [bodyMatcher] - Optional callback to match the request body.
 *   It takes the request body and returns true if this mock should handle it.
 *   Needed for distinguishing requests with the same URL and method but different parameters
 *   (e.g., 'eth_getLogs' with unique 'topics'). Prevents test errors by ensuring precise mock matching.
 *   If not provided, defaults to checking the 'method' field in the body (if specified).
 * @param domain
 */
export const mockEthServer = <T>(
  { url, method, result, body, bodyMatcher }: MockParams<T>,
  domain: string
) => {
  const nockInstance = nock(domain)
  switch (method) {
    case 'GET':
      nockInstance.get(url).reply(200, result as any)
      break

    case 'POST':
      if (bodyMatcher) {
        nockInstance
          .post(url, (reqBody) => bodyMatcher(reqBody))
          .reply(200, result as any)
      } else if (body) {
        nockInstance
          .post(url, (b) => b.method === body.method)
          .reply(200, result as any)
      } else {
        nockInstance.post(url).reply(200, result as any)
      }
      break
    default:
      throw new Error(`Unsupported method: ${method}`)
  }

  return nockInstance
}
