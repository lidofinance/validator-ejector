import { HttpException } from './errors.js'
import type { InternalConfig, Middleware, RequestConfig } from './types'

export const getUrl = (
  baseUrl: RequestInfo | undefined,
  url: RequestInfo
): RequestInfo => {
  if (typeof url !== 'string') return url
  if (baseUrl == null) return url
  if (isAbsoluteUrl(url)) return url

  return `${baseUrl}${url}`
}

export const isAbsoluteUrl = (url: RequestInfo): boolean => {
  const regexp = new RegExp('^(?:[a-z]+:)?//', 'i')
  return regexp.test(url.toString())
}

export const extractErrorBody = async (response: Response) => {
  try {
    return await response.json()
  } catch (error) {
    return response.statusText
  }
}

export const isNotServerError = (error: Error) =>
  !(error instanceof HttpException)

const fetchCall = ({ url, baseUrl, ...rest }: RequestConfig) =>
  fetch(getUrl(baseUrl, url), rest)

/**
 * Simple wrapper around fetch with middlewares
 * ```ts
 * const myRequest = request([
 *   retry(3, { ignoreAbort: true }),
 *   loggerMiddleware(logger),
 *   notOkError(),
 *   abort(1000)
 * ])
 * const res = await myRequest('http://some-url')
 * ```
 * @param middleware Middleware[]
 * @returns fetchLike
 */
export const request = (middleware: Middleware[]) => {
  return (url: RequestInfo, requestConfig?: RequestConfig) => {
    // copy object bcs we can mutate it
    const internalConfig = { ...requestConfig } as InternalConfig
    internalConfig.attempt = 0
    internalConfig.url = url

    async function chain(
      config: InternalConfig,
      middleware: Middleware[]
    ): Promise<Response> {
      if (middleware.length === 0) return fetchCall(config)
      return middleware[0](config, (config) =>
        chain(config, middleware.slice(1))
      )
    }

    return chain(internalConfig, middleware)
  }
}
