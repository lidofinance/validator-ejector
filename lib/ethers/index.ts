// JsonRpcProvider
import { ethers } from 'ethers'
import { deepCopy, fetchJson } from 'ethers/lib/utils.js'
import { Histogram } from 'prom-client'
import { makeLogger } from '../logger'

type RPCDI = { metric: Histogram; logger: ReturnType<typeof makeLogger> }

function getResult(payload: {
  error?: { code?: number; data?: any; message?: string }
  result?: any
}): any {
  if (payload.error) {
    const error: any = new Error(payload.error.message)
    error.code = payload.error.code
    error.data = payload.error.data
    throw error
  }

  return payload.result
}

const diSymbol = Symbol.for('validator-ejector-di')

class JsonRpcProvider extends ethers.providers.JsonRpcProvider {
  [diSymbol]: RPCDI
  constructor(rpcUrl: string, di: RPCDI) {
    super(rpcUrl)
    this[diSymbol] = di
  }
  async send(method: string, params: Array<any>): Promise<any> {
    const { logger, metric } = this[diSymbol]
    const classCache = this._cache as Record<
      string,
      Promise<any> | undefined | null
    >

    const request = {
      method: method,
      params: params,
      id: this._nextId++,
      jsonrpc: '2.0',
    }

    this.emit('debug', {
      action: 'request',
      request: deepCopy(request),
      provider: this,
    })

    const cache = ['eth_chainId', 'eth_blockNumber'].indexOf(method) >= 0
    if (cache && classCache[method]) {
      return this._cache[method]
    }

    let result
    let end
    try {
      logger.debug(`JsonRPC request ${request.method}`)

      end = metric.startTimer()
      result = await fetchJson(
        this.connection,
        JSON.stringify(request),
        getResult
      )
      end({ result: 'response' })
    } catch (error) {
      logger.warn('JsonRPC error', error)

      end({ result: 'error' })

      this.emit('debug', {
        action: 'response',
        error: error,
        request: request,
        provider: this,
      })

      throw error
    }
    this.emit('debug', {
      action: 'response',
      request: request,
      response: result,
      provider: this,
    })

    // Cache the fetch, but clear it on the next event loop
    if (cache) {
      classCache[method] = result
      setTimeout(() => {
        classCache[method] = null
      }, 0)
    }

    return result
  }
}

export const makeJSONRPC = (rpcUrl: string, db: RPCDI) => {
  return new JsonRpcProvider(rpcUrl, db)
}
