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
    item => ({ [args[0][0]]: item }))
}

const macros = {
  $quote: (args) => {
    return args[0]
  },
  $where: async (args, evaluate, environment) => {
    const filtered = []
    for (const item of await evaluate(args[1], environment)) {
      const entries = Object.entries(item).map(
        ([key, value]) => [`${key}:`, value])
      entries.push([':', entries[0][1]])
      const environment = Environment({
        ...Object.fromEntries(entries),
        __namespaces__: entries.map(item => item[0])
      })
      if (await evaluate(args[0], environment)) {
        filtered.push(item)
      }
    }
    return filtered
  },
  $wait: (args) => {
    return Promise.all(args)
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
