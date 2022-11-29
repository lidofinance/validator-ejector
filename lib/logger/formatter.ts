export const formatter = {
  json<T>(target: T) {
    return JSON.stringify(target)
  },
  simple<T>(target: T) {
    return JSON.stringify(target, null, 2)
  },
}
