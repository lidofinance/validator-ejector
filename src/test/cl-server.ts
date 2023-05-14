import nock from 'nock'
import { ConfigService } from 'services/config/service.js'

type MockParams<T> = {
  url: string
  method: string
  result: T
}

export const mockCLServer = <T>(
  { url, method, result }: MockParams<T>,
  config: ConfigService
) => {
  const domain = config.CONSENSUS_NODE.endsWith('/')
    ? config.CONSENSUS_NODE.slice(0, -1)
    : config.CONSENSUS_NODE
  const nockInstance = nock(domain)

  switch (method) {
    case 'GET':
      nockInstance.get(url).reply(200, result as any)
      break
    case 'POST':
      nockInstance.post(url).reply(200, result as any)
      break
    default:
      throw new Error(`Unsupported method: ${method}`)
  }

  return nockInstance
}
