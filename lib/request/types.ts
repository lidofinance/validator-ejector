export interface RequestConfig extends RequestInit {
  url: RequestInfo
  baseUrl?: RequestInfo
}

export interface InternalConfig extends RequestConfig {
  attempt: number
}

export type Middleware = (
  config: InternalConfig,
  next: (config: InternalConfig) => Promise<Response>
) => Promise<Response>
