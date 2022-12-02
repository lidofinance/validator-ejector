import type {
  RequestInit,
  Response as FetchResponse,
  RequestInfo as FetchRequestInfo,
} from 'node-fetch'
export interface RequestConfig extends RequestInit {
  baseUrl?: FetchRequestInfo
}

export interface InternalConfig extends RequestConfig {
  url: FetchRequestInfo
  attempt: number
}

export type Middleware = (
  config: InternalConfig,
  next: (config: InternalConfig) => Promise<FetchResponse>
) => Promise<FetchResponse>

export type Response = FetchResponse
export type RequestInfo = FetchRequestInfo
