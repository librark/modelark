export function Environment (context = {}) {
  return merge(standardOperators, context)
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

const surround = (item) => {
  const entries = Object.entries(item).map(
    ([key, value]) => [`${key}:`, value])
  entries.push([':', entries[0][1]])
  return Environment({
    ...Object.fromEntries(entries),
    __namespaces__: entries.map(item => item[0])
  })
}

const comparisonOperators = {
  '=': (args) => args.every(value => value === args[0]),
  '!=': (args) => !args.every(value => value === args[0]),
  '>': (args) => args.slice(1).map(
    (value, index) => args[index] > value).every(Boolean),
  '<': (args) => args.slice(1).map(
    (value, index) => args[index] < value).every(Boolean),
  '>=': (args) => args.slice(1).map(
    (value, index) => args[index] >= value).every(Boolean),
  '<=': (args) => args.slice(1).map(
    (value, index) => args[index] <= value).every(Boolean),
  $like: (args) => args.slice(1).every(value => RegExp(
        `^${value}$`.replace(/%/g, '.*').replace(/_/g, '.')).test(args[0])),
  $ilike: (args) => args.slice(1).every(
    value => RegExp(`^${value}$`.replace(/%/g, '.*').replace(
      /_/g, '.').toLowerCase()).test(args[0].toLowerCase())),
  $in: (args) => args.flat().slice(1).includes(args[0]),
  $contains: (args) => args.flat().slice(1).every(
    value => args[0].includes(value))
}

const logicalOperators = {
  $and: (args) => args.every(Boolean),
  $or: (args) => args.some(Boolean),
  $not: (args) => !args.every(Boolean)
}

const arithmeticOperators = {
  '+': (args) => args.flat().reduce(
    (previous, current) => previous + current),
  '-': (args) => args.flat().reduce(
    (previous, current) => previous - current),
  '*': (args) => args.flat().reduce(
    (previous, current) => previous * current),
  '/': (args) => (args.flat())[0] / args.flat().slice(
    1).reduce((previous, current) => previous * current)
}

const objectOperators = {
  $get: (args) => args[1].match(/([^[.\]])+/g).reduce(
    (accumulator, key) => accumulator && accumulator[
      key.trim()], args[0]) || args[2]
}

const collectionOperators = {
  $map: (args) => args[1].map(arg => arg[args[0]]),
  $unique: (args) => Array.from(new Set(args[0])),
  $size: (args) => args[0].length
}

const queryOperators = {
  $as: (args) => args,
  $from: (args) => args[0][1].map(
    item => ({ [args[0][0]]: item })),
  // $count: () => {},
  $sum: () => {},
  $avg: () => {},
  $min: () => {},
  $max: () => {}
}

const macros = {
  $quote: async (args) => {
    return args[0]
  },
  $wait: async (args) => {
    return Promise.all(args)
  },
  $where: async (args, evaluate, environment) => {
    const filtered = []
    for (const item of await evaluate(args[1], environment)) {
      const environment = surround(item)
      if (await evaluate(args[0], environment)) {
        filtered.push(item)
      }
    }
    return filtered
  },
  $group: async (args, evaluate, environment) => {
    const groups = {}
    for (const item of await evaluate(args[1], environment)) {
      const keys = []
      const environment = surround(item)
      for (const key of args[0]) {
        keys.push(await evaluate(key, environment))
      }
      const group = keys.join(',')
      groups[group] = groups[group] ?? []
      groups[group].push(item)
    }
    return Object.entries(groups).map(([key, value]) => {
      const fields = args[0].map(field => field.replace(':', ''))
      const __groups__ = Object.fromEntries(
        key.split(',').map((value, index) => [fields[index], value]))
      const __items__ = value
      return { __groups__, __items__ }
    })
  },
  $count: async (args, evaluate, environment) => {
    let count = 0
    for (const item of environment['__items__:']) {
      const environment = surround(item)
      const value = await evaluate(args[0], environment)
      if (value === undefined || value === null) continue
      count += 1
    }
    return count
  },
  $having: async (args, evaluate, environment) => {
    const filtered = []
    for (const item of await evaluate(args[1], environment)) {
      const environment = surround(item)
      if (await evaluate(args[0], environment)) {
        filtered.push(item)
      }
    }
    return filtered
  },
  $select: async (args, evaluate, environment) => {
    const rows = []
    for (const item of await evaluate(args[1], environment)) {
      const environment = surround(item)
      const row = {}
      for (const element of args[0]) {
        const key = element.split(':').filter(Boolean).join('_')
        row[key] = await evaluate(element, environment)
      }
      rows.push(row)
    }
    return rows
  }
}

export const standardOperators = {
  ...comparisonOperators,
  ...logicalOperators,
  ...arithmeticOperators,
  ...objectOperators,
  ...collectionOperators,
  ...queryOperators,
  __macros__: { ...macros },
  __namespaces__: [':']
}
