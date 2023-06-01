export const functionalOperators = {
  _get: (args) => args[0].match(/([^[.\]])+/g).reduce(
    (accumulator, key) => accumulator && accumulator[
      key.trim()], args[1]) || args[2],
  _map: (args) => args[1].map(arg => arg[args[0]]),
  _unique: (args) => Array.from(new Set(args[0])),
  _size: (args) => args[0].length
}

export const controlOperators = {
  _wait: async (args) => Promise.all(args),
  _fetch: async (args) => {
    const response = await globalThis.fetch(args[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...args[1]
    })
    return response.json()
  }
}

export const baseOperators = {
  ...functionalOperators,
  ...controlOperators
}
