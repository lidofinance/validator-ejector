import { str, num, bool, optional } from './index.js'

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
