export const functionalOperators = {
  _get: (args) => args[1].match(/([^[.\]])+/g).reduce(
    (accumulator, key) => accumulator && accumulator[
      key.trim()], args[0]) || args[2],
  _map: (args) => args[1].map(arg => arg[args[0]]),
  _unique: (args) => Array.from(new Set(args[0])),
  _size: (args) => args[0].length
}

export const controlOperators = {
  _wait: async (args) => Promise.all(args)
}

export const baseOperators = {
  ...functionalOperators,
  ...controlOperators
}
