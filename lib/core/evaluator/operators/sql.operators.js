import { baseOperators } from './base.operators.js'

const columnTag = '@column::'

const placeholderTag = '!#!'

export const namespaceProxy = new Proxy({}, {
  get (_, property) {
    return `${columnTag}${property}`
  }
})

const combine = (leftArray, rightArray) => (
  leftArray.map((leftItem) => rightArray.map(
    (rightItem) => [leftItem, rightItem])).flat())

const operatorDecorator = (operator) => (args) => {
  let columns = args.filter(arg => String(arg).startsWith(columnTag))
  const parameters = args.filter(arg => !columns.includes(arg))
  columns = columns.map(column => `"${column.replace(columnTag, '')}"`)
  const pairs = combine(columns, parameters)

  const statement = pairs.map(
    ([column]) => [column, placeholderTag].join(
      ` ${operator} `.toUpperCase())).join(' AND ')
  const values = pairs.map(item => item.pop())

  return { statement, values }
}

const comparisonOperators = {
  '=': operatorDecorator('='),
  '!=': operatorDecorator('!='),
  '>': operatorDecorator('>'),
  '<': operatorDecorator('<'),
  '>=': operatorDecorator('>='),
  '<=': operatorDecorator('<='),
  $like: operatorDecorator('like'),
  $ilike: operatorDecorator('ilike'),
  $in: (args) => {
    const column = args[0].replace(columnTag, '')
    const values = [args.slice(1).flat()]
    const statement = `"${column}" = ANY(${placeholderTag})`
    return { statement, values }
  },
  $contains: (args) => {
    const column = args[0].replace(columnTag, '')
    const values = [args.slice(1).flat()]
    const statement = `"${column}" @> ${placeholderTag}`
    return { statement, values }
  },
  $and: (args) => {
    const statement = args.map(item => item.statement).join(' AND ')
    const values = args.map(item => item.values).flat()
    return { statement, values }
  },
  $or: (args) => {
    const statement = args.map(item => item.statement).join(' OR ')
    const values = args.map(item => item.values).flat()
    return { statement, values }
  },
  $not: (args) => {
    const statement = `NOT (${args.map(item => item.statement).join(' AND ')})`
    const values = args.map(item => item.values).flat()
    return { statement, values }
  }
}

// const logicalOperators = {
// $and: (args) => args.every(Boolean),
// $or: (args) => args.some(Boolean),
// $not: (args) => !args.every(Boolean)
// }

// const arithmeticOperators = {
// '+': (args) => args.flat().reduce(
// (previous, current) => previous + current),
// '-': (args) => args.flat().reduce(
// (previous, current) => previous - current),
// '*': (args) => args.flat().reduce(
// (previous, current) => previous * current),
// '/': (args) => (args.flat())[0] / args.flat().slice(
// 1).reduce((previous, current) => previous * current)
// }

const queryOperators = {
  $as: (args) => {
    return { statement: `"${args[1]}" AS "${args[0]}"`, values: [] }
  },
  $on: (args) => args,
  $from: (args) => {
    return { statement: `FROM ${args[0].statement}`, values: args[0].values }
  },
  $limit: (args) => {
    let segment = args[0]
    if (segment.constructor === Number) {
      segment = { offset: 0, limit: segment }
    }
    return args[1].slice(segment.offset ?? 0, (
      segment.offset + segment.limit) ?? Infinity)
  }
}

const macros = {
  $quote: async (args) => {
    return args[0]
  },
  $wait: async (args) => {
    return Promise.all(args)
  },
  $where: async (args, evaluate, environment) => {
    const first = await evaluate(args[1], environment)
    const last = await evaluate(args[0], environment)
    const statement = `${first.statement} WHERE ${last.statement}`
    const values = [...first.values, ...last.values]
    return { statement, values }
  },
  $join: async (args, evaluate, environment) => {
    const filtered = []
    const source = await evaluate(args[0], environment)
    const relation = source[1].map(item => ({ [source[0]]: item }))
    for (const right of relation) {
      for (const left of await evaluate(args[2], environment)) {
        const item = { ...left, ...right }
        const environment = surround(item)
        if (await evaluate(args[1], environment)) {
          filtered.push(item)
        }
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
      const field = args[0].replace('*', 'id')
      const value = await evaluate(field, environment)
      if (value === undefined || value === null) continue
      count += 1
    }
    return count
  },
  $sum: async (args, evaluate, environment) => {
    let sum = 0
    for (const item of environment['__items__:']) {
      const environment = surround(item)
      const value = await evaluate(args[0], environment)
      if (value === undefined || value === null) continue
      sum += value
    }
    return sum
  },
  $avg: async (args, evaluate, environment) => {
    let count = 0
    let sum = 0
    for (const item of environment['__items__:']) {
      const environment = surround(item)
      const value = await evaluate(args[0], environment)
      if (value === undefined || value === null) continue
      count += 1
      sum += value
    }
    return sum / count
  },
  $max: async (args, evaluate, environment) => {
    let max = Number.NEGATIVE_INFINITY
    for (const item of environment['__items__:']) {
      const environment = surround(item)
      const value = await evaluate(args[0], environment)
      if (value === undefined || value === null) continue
      if (value > max) max = value
    }
    return max
  },
  $min: async (args, evaluate, environment) => {
    let min = Number.POSITIVE_INFINITY
    for (const item of environment['__items__:']) {
      const environment = surround(item)
      const value = await evaluate(args[0], environment)
      if (value === undefined || value === null) continue
      if (value < min) min = value
    }
    return min
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
  $select: async (args, evaluate, environment) => {
    const fields = []
    for (const element of args[0]) {
      fields.push(await evaluate(element, environment))
    }
    const projection = fields.map(field => `"${field}"`).join(', ')
    const selection = await evaluate(args[1], environment)
    const statement = `SELECT ${projection} ${selection.statement}`
    const values = selection.values
    return { statement, values }
  }
}

export const sqlOperators = {
  ...baseOperators,
  ...comparisonOperators,
  // ...logicalOperators,
  // ...arithmeticOperators,
  ...queryOperators,
  __macros__: { ...macros }
  // __namespaces__: [':']
}
