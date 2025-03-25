import { LRUCache } from './index.js'

describe('LRUCache', () => {
  let cache: LRUCache<string, number>

  beforeEach(() => {
    cache = new LRUCache<string, number>(3) // Small limit for testing
  })

  it('should store and retrieve values', () => {
    cache.set('a', 1)
    cache.set('b', 2)

    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBeUndefined()
  })

  it('should check if key exists', () => {
    cache.set('a', 1)

    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
  })

  it('should return size of cache', () => {
    expect(cache.size()).toBe(0)

    cache.set('a', 1)
    cache.set('b', 2)

    expect(cache.size()).toBe(2)
  })

  it('should delete keys', () => {
    cache.set('a', 1)
    cache.set('b', 2)

    expect(cache.delete('a')).toBe(true)
    expect(cache.size()).toBe(1)
    expect(cache.has('a')).toBe(false)
    expect(cache.delete('nonexistent')).toBe(false)
  })

  it('should clear the cache', () => {
    cache.set('a', 1)
    cache.set('b', 2)

    cache.clear()

    expect(cache.size()).toBe(0)
    expect(cache.has('a')).toBe(false)
  })

  it('should respect the capacity limit', () => {
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    cache.set('d', 4) // This should evict the oldest key ('a')

    expect(cache.has('a')).toBe(false)
    expect(cache.has('b')).toBe(true)
    expect(cache.has('c')).toBe(true)
    expect(cache.has('d')).toBe(true)
    expect(cache.size()).toBe(3)
  })

  it('should update LRU order when getting an item', () => {
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)

    // Access 'a' to make it most recently used
    cache.get('a')

    // Adding a new item should now evict 'b' instead of 'a'
    cache.set('d', 4)

    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
    expect(cache.has('c')).toBe(true)
    expect(cache.has('d')).toBe(true)
  })

  it('should update existing keys without affecting LRU order of others', () => {
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)

    // Update the value of 'b'
    cache.set('b', 22)

    // 'b' should now be the most recently used
    cache.set('d', 4) // Should evict 'a'

    expect(cache.has('a')).toBe(false)
    expect(cache.get('b')).toBe(22)
    expect(cache.has('c')).toBe(true)
    expect(cache.has('d')).toBe(true)
  })

  it('should return keys and values', () => {
    cache.set('a', 1)
    cache.set('b', 2)

    const keys = cache.keys()
    const values = cache.values()

    expect(keys).toContain('a')
    expect(keys).toContain('b')
    expect(keys.length).toBe(2)

    expect(values).toContain(1)
    expect(values).toContain(2)
    expect(values.length).toBe(2)
  })
})
