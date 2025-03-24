import { str, obj } from './index.js'

const errorValue = (fn: () => any) => {
  try {
    fn()
  } catch (error) {
    return { ...error }
  }
}

describe('error handling', () => {
  test('object passes nested error', () => {
    const value = { test: { some: { value: 1 } } } as unknown
    const cast = () =>
      obj(value, (value) => ({
        test: obj(value.test, (test) => ({
          some: obj(test.some, (some) => ({ value: str(some.value) })),
        })),
      }))

    expect(cast).toThrow(`Invalid string input: "1"`)
  })

  test('object has source in error object', () => {
    const value = { test: { some: { value: 1 } } } as unknown
    const cast = () =>
      obj(value, (value) => ({
        test: obj(value.test, (test) => ({
          some: obj(test.some, (some) => ({ value: str(some.value) })),
        })),
      }))

    expect(errorValue(cast)).toMatchInlineSnapshot(`
      {
        "validatedData": {
          "test": {
            "some": {
              "value": 1,
            },
          },
        },
      }
    `)
  })
})
