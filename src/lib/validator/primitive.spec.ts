import { str, num, bool, optional, url_list } from './index.js'

describe('data casting', () => {
  test('string', () => {
    const value = '1' as unknown
    expect(str(value)).toBe('1')
  })
  test('number', () => {
    const value = '1' as unknown
    expect(num(value)).toBe(1)
  })
  test('boolean as string', () => {
    const value = 'true' as unknown
    expect(bool(value)).toBe(true)
  })
  test('boolean as upper string (True)', () => {
    const value = 'True' as unknown
    expect(bool(value)).toBe(true)
  })
  test('boolean as upper string (False)', () => {
    const value = 'False' as unknown
    expect(bool(value)).toBe(false)
  })
  test('boolean as boolean', () => {
    const value = true as unknown
    expect(bool(value)).toBe(true)
  })
})

describe('data casting optional', () => {
  test('string', () => {
    const value = '1' as unknown
    expect(optional(() => str(value))).toBe('1')
    expect(optional(() => str())).toBe(undefined)
  })
  test('number', () => {
    const value = '1' as unknown
    expect(optional(() => num(value))).toBe(1)
    expect(optional(() => num())).toBe(undefined)
  })
  test('boolean as string', () => {
    const value = 'true' as unknown
    expect(optional(() => bool(value))).toBe(true)
    expect(optional(() => bool())).toBe(undefined)
  })
  test('boolean as upper string (True)', () => {
    const value = 'True' as unknown
    expect(optional(() => bool(value))).toBe(true)
    expect(optional(() => bool())).toBe(undefined)
  })
  test('boolean as upper string (False)', () => {
    const value = 'False' as unknown
    expect(optional(() => bool(value))).toBe(false)
    expect(optional(() => bool())).toBe(undefined)
  })
  test('boolean as boolean', () => {
    const value = true as unknown
    expect(optional(() => bool(value))).toBe(true)
    expect(optional(() => bool())).toBe(undefined)
  })
})

describe('url_list', () => {
  test('single URL → length-1 array', () => {
    expect(url_list('http://h:8545')).toEqual(['http://h:8545'])
  })
  test('comma-separated URLs are split, trimmed, and stripped', () => {
    expect(url_list('http://a:1, http://b:2 ,http://c:3/')).toEqual([
      'http://a:1',
      'http://b:2',
      'http://c:3',
    ])
  })
  test('multiple trailing slashes are all removed', () => {
    expect(url_list('http://h:8545//')).toEqual(['http://h:8545'])
    expect(url_list('http://h:8545///')).toEqual(['http://h:8545'])
  })
  test('empty entries from trailing/leading commas are dropped', () => {
    expect(url_list(',http://a:1,, ,http://b:2,')).toEqual([
      'http://a:1',
      'http://b:2',
    ])
  })
  test('whitespace-only input throws', () => {
    expect(() => url_list('   ')).toThrow()
    expect(() => url_list(',,,')).toThrow()
  })
})

describe('optional error', () => {
  test('string', () => {
    expect(() => optional(() => str(1))).toThrow()
  })
  test('number', () => {
    expect(() => optional(() => num('1sss'))).toThrow()
  })
  test('boolean as string', () => {
    expect(() => optional(() => bool('test'))).toThrow()
  })
  test('boolean as boolean', () => {
    expect(() => optional(() => bool('value'))).toThrow()
  })
})
