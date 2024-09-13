import { Evaluator, Environment, baseOperators } from '../evaluator/index.js'

export class DataParser {
  constructor () {
    this.evaluator = new Evaluator()
  }

  async parse (expression, context = {}) {
    const environment = new Environment({ ...dataOperators, ...context })
    return this.evaluator.evaluate(expression, environment)
  }
}

const comparisonOperators = {
  '=': (args) => args.slice(1).every(
    value => value === args[0]),
  '!=': (args) => !args.slice(1).every(
    value => value === args[0]),
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
  $in: (args) => (args[0] != null) && args.flat().slice(1).includes(args[0]),
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

const queryOperators = {
  $as: async (args) => args,
  $for: async (args) => args.slice(1).flat(),
  $from: (args) => {
    return args[0][1].map(
      item => ({ [args[0][0]]: item }))
  },
  $limit: (args) => {
    let segment = args[0]
    if (segment.constructor === Number) {
      segment = { offset: 0, limit: segment }
    }
    return args[1].slice(segment.offset ?? 0, (
      (segment.offset ?? 0) + (segment.limit ?? Infinity)))
  },
  $with: async (args) => args
}

const macros = {
  // ...aggregateMacros,
  $quote: async (args) => {
    return args[0]
  },
  $where: async (args, evaluate, environment) => {
    const filtered = []
    for (const item of await evaluate(args[1], environment)) {
      const condition = args[0]?.length ? args[0] : true
      if (await evaluate(condition, environment.surround(item))) {
        filtered.push(item)
      }
    }
    return filtered
  },
  $join: async (args, evaluate, environment) => {
    const filtered = []
    const base = await evaluate(args[2], environment)
    const source = await evaluate(args[0], environment)
    const relation = source[1].map(item => ({ [source[0]]: item }))
    for (const right of relation) {
      for (const left of base) {
        const item = { ...left, ...right }
        if (await evaluate(args[1], environment.surround(item))) {
          filtered.push(item)
        }
      }
    }
    return filtered
  },
  $leftJoin: async (args, evaluate, environment) => {
    const filtered = []
    const base = await evaluate(args[2], environment)
    const source = await evaluate(args[0], environment)
    const relation = source[1].map(item => ({ [source[0]]: item }))
    for (const left of base) {
      let matched = []
      for (const right of relation) {
        const item = { ...left, ...right }
        const result = await evaluate(args[1], environment.surround(item))
        if (result) {
          matched.push(item)
        }
      }
      matched = matched.length ? matched : [{ ...left, [source[0]]: null }]
      filtered.push(...matched)
    }
    return filtered
  },
  $concat: async (args, evaluate, environment) => {
    const fields = []
    for (const element of args) {
      fields.push(await evaluate(element, environment))
    }
    return fields.join('')
  },
  $group: async (args, evaluate, environment) => {
    const groups = {}
    for (const item of await evaluate(args[1], environment)) {
      const keys = []
      for (const key of args[0]) {
        keys.push(await evaluate(key, environment.surround(item)))
      }
      const group = keys.join(',')
      groups[group] = groups[group] ?? []
      groups[group].push(item)
    }
    return Object.entries(groups).map(([key, value]) => {
      const names = key.split(',')
      const fields = args[0].map(field => field.split(':'))
      const values = fields.map(
        (pair, index) => [pair[0], { [pair[1]]: names[index] }])
      const namespaces = values.reduce((dictionary, pair) => {
        dictionary[pair[0]] = dictionary[pair[0]] ?? {}
        dictionary[pair[0]] = { ...dictionary[pair[0]], ...pair[1] }
        return dictionary
      }, {})
      const __items__ = value
      return { ...namespaces, __items__ }
    })
  },
  $count: async (args, evaluate, environment) => {
    let count = 0
    for (const item of environment['__items__:']) {
      const field = args[0].replace('*', 'id')
      const value = await evaluate(field, environment.surround(item))
      if (value === null) continue
      count += 1
    }
    return count
  },
  $sum: async (args, evaluate, environment) => {
    let sum = 0
    for (const item of environment['__items__:']) {
      const value = await evaluate(args[0], environment.surround(item))
      if (value === null) continue
      sum += value
    }
    return sum
  },
  $avg: async (args, evaluate, environment) => {
    let count = 0
    let sum = 0
    for (const item of environment['__items__:']) {
      const value = await evaluate(args[0], environment.surround(item))
      if (value === null) continue
      count += 1
      sum += value
    }
    return sum / count
  },
  $max: async (args, evaluate, environment) => {
    let max = Number.NEGATIVE_INFINITY
    for (const item of environment['__items__:']) {
      const value = await evaluate(args[0], environment.surround(item))
      if (value === null) continue
      if (value > max) max = value
    }
    return max
  },
  $min: async (args, evaluate, environment) => {
    let min = Number.POSITIVE_INFINITY
    for (const item of environment['__items__:']) {
      const value = await evaluate(args[0], environment.surround(item))
      if (value === null) continue
      if (value < min) min = value
    }
    return min
  },
  $having: async (args, evaluate, environment) => {
    const filtered = []
    for (const item of await evaluate(args[1], environment)) {
      if (await evaluate(args[0], environment.surround(item))) {
        filtered.push(item)
      }
    }
    return filtered
  },
  $order: async (args, evaluate, environment) => {
    const parts = args[0].map(part => part.constructor === Object
      ? Object.entries(part).pop()
      : [part, '$asc'])
    const comparators = []
    for (const [field, direction] of parts) {
      const sign = direction?.toLowerCase() === '$desc' ? -1 : 1
      comparators.push({ field, sign })
    }
    const extract = (item, field) => {
      let [namespace, attribute] = field.split(':')
      namespace = namespace || Object.keys(item)[0]
      return item[namespace][attribute]
    }
    const items = await evaluate(args[1], environment)
    return items.sort((source, target) => comparators.reduce(
      (previous, current) => {
        return previous || JSON.stringify(
          extract(source, current.field)).localeCompare(
          JSON.stringify(extract(target, current.field)),
          undefined, { numeric: true }) * current.sign
      }, 0))
  },
  $union: async (args, evaluate, environment) => {
    const subqueries = []
    for (const arg of args) {
      subqueries.push(await evaluate(arg, environment))
    }
    return subqueries.flat()
  },
  $select: async (args, evaluate, environment) => {
    let items = await evaluate(args[1], environment)
    if (!items.length) return items
    const aggregates = args[0].flat(Number.MAX_SAFE_INTEGER).filter(item =>
      ['$count', '$sum', '$avg', '$min', '$max'].includes(item))
    if (!items[0]?.__items__ && aggregates.length) {
      items = [{ __items__: items }]
    }
    const rows = []
    for (const item of items) {
      const row = {}
      const { __groups__, ...content } = item
      for (const element of args[0]) {
        const result = await evaluate(element, environment.surround(
          { ...__groups__, ...content }))
        if (String(element).startsWith('$as')) {
          Object.assign(row, Object.fromEntries([result]))
          continue
        }
        const field = String(element).replace(':', '').replace('$', '')
        const key = field.split(',').shift()
        if (key.endsWith('*')) {
          let namespace = key.slice(0, -1)
          namespace = namespace || Object.keys(item).shift()
          const content = item[namespace]
          Object.assign(row, { ...content })
          continue
        }
        row[key] = result
      }
      rows.push(row)
    }
    return rows
  }
}

const dataOperators = {
  ...baseOperators,
  ...comparisonOperators,
  ...logicalOperators,
  ...arithmeticOperators,
  ...queryOperators,
  __macros__: { ...macros }
}
