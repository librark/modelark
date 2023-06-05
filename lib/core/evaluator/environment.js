export class Environment {
  constructor (context) {
    Object.assign(this, context)
  }

  surround (item) {
    const entries = Object.entries(item).map(
      ([key, value]) => [`${key}:`, value])
    entries.push([':', entries[0][1]])
    return Object.assign(this, merge(this, {
      ...Object.fromEntries(entries),
      __namespaces__: new Set([
        ...this.__namespaces__, ...entries.map(item => item[0])])
    }))
  }
}

const merge = (first, second) => {
  const merged = { ...first, ...second }
  for (const key of Object.keys(merged)) {
    if (first && second && merged[key]?.constructor === Object) {
      merged[key] = merge(first[key], second[key])
    }
  }
  return merged
}
