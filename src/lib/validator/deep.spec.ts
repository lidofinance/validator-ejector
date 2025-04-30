import { str, num, obj, arr, json_obj, json_arr } from './index.js'

const node19orHigher = parseInt(process.versions.node.split('.')[0]) >= 19

describe('deep data casting', () => {
  test('object', () => {
    const value = { test: { some: { value: 'here' } } } as unknown
    const cast = obj(value, (value) => ({
      test: obj(value.test, (test) => ({
        some: obj(test.some, (some) => ({ value: str(some.value) })),
      })),
    }))
    expect(cast.test.some.value).toBe('here')
  })

  test('array numbers', () => {
    const value = [1, 2, 3] as unknown
    const cast = arr(value, (array) => array.map(num))
    expect(cast).toStrictEqual([1, 2, 3])
  })

  test('array strings', () => {
    const value = ['1', '2', '3'] as unknown
    const cast = arr(value, (array) => array.map(str))
    expect(cast).toStrictEqual(['1', '2', '3'])
  })

  describe('json values', () => {
    test('json object', () => {
      const value = JSON.stringify({ test: { some: { value: 'here' } } })
      const cast = () =>
        json_obj(value, (value) => ({
          test: obj(value.test, (test) => ({
            some: obj(test.some, (some) => ({ value: str(some.value) })),
          })),
        }))
      expect(cast().test.some.value).toBe('here')
    })

    test('json array numbers', () => {
      const value = JSON.stringify([1, 2, 3])
      const cast = () => json_arr(value, (array) => array.map(num))
      expect(cast()).toStrictEqual([1, 2, 3])
    })

    test('json array strings', () => {
      const value = JSON.stringify(['1', '2', '3'])
      const cast = () => json_arr(value, (array) => array.map(str))
      expect(cast()).toStrictEqual(['1', '2', '3'])
    })
  })

  describe('json error values', () => {
    test('json object', () => {
      const value = '{'
      const cast = () =>
        json_obj(value, (value) => ({
          test: obj(value.test, (test) => ({
            some: obj(test.some, (some) => ({ value: str(some.value) })),
          })),
        }))
      expect(cast).toThrow()
      if (node19orHigher) {
        expect(cast).toThrowError(
          "Expected property name or '}' in JSON at position 1"
        )
      } else {
        expect(cast).toThrowError('Unexpected end of JSON input')
      }
    })

    test('json array numbers', () => {
      const value = '[1'
      const cast = () => json_arr(value, (array) => array.map(num))
      expect(cast).toThrow()
      if (node19orHigher) {
        expect(cast).toThrowError(
          "Expected ',' or ']' after array element in JSON at position 2"
        )
      } else {
        expect(cast).toThrowError('Unexpected end of JSON input')
      }
    })

    test('json array strings', () => {
      const value = '["s"'
      const cast = () => json_arr(value, (array) => array.map(str))
      expect(cast).toThrow()
      if (node19orHigher) {
        expect(cast).toThrowError(
          "Expected ',' or ']' after array element in JSON at position 4"
        )
      } else {
        expect(cast).toThrowError('Unexpected end of JSON input')
      }
    })
  })
})
