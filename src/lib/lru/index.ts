export class LRUCache<K, V> {
  private limit: number
  private cache: Map<K, V>

  constructor(limit = 100) {
    this.limit = limit
    this.cache = new Map()
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined
    const value = this.cache.get(key)
    if (value === undefined) return undefined
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.limit) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  keys(): K[] {
    return Array.from(this.cache.keys())
  }

  values(): V[] {
    return Array.from(this.cache.values())
  }
}
