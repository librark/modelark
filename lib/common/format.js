/**
 * Convert Strings from camelCase to snake_case
 * @param {string} input @returns {string} */
export function camelToSnake (input) {
  return input.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
}

/**
 * Convert Strings from snake to camelCase
 * @param {string} input @returns {string} */
export function snakeToCamel (input) {
  return input.replace(/_([a-z])/g, function (g) {
    return g[1].toUpperCase()
  })
}

export function dedent (input) {
  return input.split('\n').map(line => line.trim()).join('\n')
}
