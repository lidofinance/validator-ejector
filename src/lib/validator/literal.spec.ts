import { optional, literal_str, literal_num } from './index.js'

describe('literal', () => {
  test('string', () => {
    const expected = 'test' as const
    const value = 'test' as unknown
    expect(literal_str(expected, value)).toBe(expected)
  })
  test('empty string', () => {
    const expected = '' as const
    const value = '' as unknown
    expect(literal_str(expected, value)).toBe(expected)
  })
  test('number', () => {
    const expected = 1 as const
    const value = '1' as unknown
    expect(literal_num(expected, value)).toBe(expected)
  })
})

describe('literal optional', () => {
  test('string', () => {
    const expected = 'test' as const
    const value = 'test' as unknown
    expect(optional(() => literal_str(expected, value))).toBe(expected)
  })
  test('number', () => {
    const expected = 1 as const
    const value = '1' as unknown
    expect(optional(() => literal_num(expected, value))).toBe(expected)
  })
})
