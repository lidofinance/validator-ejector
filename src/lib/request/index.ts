import { LoggerService } from '../logger/index.js'
import { HttpException } from './errors.js'
import type {
  InternalConfig,
  Middleware,
  RequestConfig,
  RequestInfo,
  Response,
} from './types'
import fetch, { FetchError } from 'node-fetch'

export type RequestService = ReturnType<typeof makeRequest>

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

export const extractErrorBody = async (
  response: Response
): Promise<string | Record<string, unknown>> => {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch (error) {
    return response.statusText
  }
}

export const isNotServerError = (error: Error) =>
  !(error instanceof HttpException) && !(error instanceof FetchError)

const fetchCall = ({ url, baseUrl, ...rest }: InternalConfig) =>
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
export const makeRequest = (initMiddlewares: Middleware[]) => {
  return (url: RequestInfo, requestConfig?: RequestConfig) => {
    const middleware = initMiddlewares.concat(requestConfig?.middlewares || [])
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

// Helper function to safely parse JSON responses
export const safelyParseJsonResponse = async (
  response: Response,
  logger: LoggerService
) => {
  try {
    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch (jsonError) {
      // If it starts with < it's likely HTML/XML, otherwise it's some other non-JSON format
      const isMarkup = text.trim().startsWith('<')
      const content = `${text.substring(0, 200)}${
        text.length > 200 ? '...' : ''
      }`
      const errorMessage = isMarkup
        ? `Received markup (HTML/XML) response instead of JSON. Status:`
        : `Invalid JSON response. Status:`

      logger.error(
        `${errorMessage} ${response.status} ${response.statusText}`,
        { content }
      )
      throw new Error(errorMessage)
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Failed to process response: ${response.statusText}`)
  }
}
