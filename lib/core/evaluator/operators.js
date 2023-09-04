export const functionalOperators = {
  _list: (args) => args,
  _unique: (args) => Array.from(new Set(args[0])),
  _size: (args) => args[0].length,
  _concat: (args) => args[0].concat(args[1]),
  _format: (args) => args.slice(1).reduce(
    (text, element, index) => text.replaceAll(`"$${index + 1}"`,
      JSON.stringify(element)),
    args[0].constructor === String ? args[0] : JSON.stringify(args[0])),
  _get: (args) => {
    const fields = args[0].split(',').map(field => field.trim())
    const values = fields.map(field => field.match(/([^[.\]])+/g).reduce(
      (accumulator, key) => accumulator && accumulator[
        key.trim()], args[1]) || args[2])
    return values.length > 1 ? values : values.pop()
  },
  _map: (args) => {
    const fields = args[0].split(',').map(field => field.trim())
    const list = args[1].map(arg => {
      const values = fields.map(field => field.match(/([^[.\]])+/g).reduce(
        (accumulator, key) => accumulator && accumulator[
          key.trim()], arg))
      return values.length > 1 ? values : values.pop()
    })
    return list
  }
}

export const controlOperators = {
  _define: async (args, _, environment) => {
    for (const prefix of environment.__namespaces__) {
      if (args[0].startsWith(prefix)) {
        environment[prefix] = environment[prefix] ?? {}
        environment[prefix][args[0].slice(prefix.length)] = args[1]
        return args[1]
      }
    }
  },
  _wait: async (args) => Promise.all(args),
  _fetch: async (args) => {
    const url = args[0]
    const options = args[1] ?? {}
    const body = args[2]
    const { headers = {}, ...settings } = options
    const response = await globalThis.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      ...settings,
      body
    })
    return response.json()
  }
}

export const baseOperators = {
  ...functionalOperators,
  ...controlOperators,
  __namespaces__: [':', '@', '#']
}
