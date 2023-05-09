import { baseOperators } from './base.operators.js'

const columnTag = '@column::'

const placeholderTag = '!#!'

export const namespaceProxy = new Proxy({}, {
  get (_, property) {
    return `${columnTag}"${property}"`
  }
})

const combine = (leftArray, rightArray) => (
  leftArray.map((leftItem) => rightArray.map(
    (rightItem) => [leftItem, rightItem])).flat())

const operatorDecorator = (operator) => (args) => {
  let columns = args.filter(
    arg => String(arg).includes(columnTag) || String(arg).includes('*'))
  const parameters = args.filter(arg => !columns.includes(arg))
  columns = columns.map(column => `${column.replace(columnTag, '')}`)

  const pairs = combine(columns, parameters)
  let statement = pairs.map(
    ([column]) => [column, placeholderTag].join(
      ` ${operator} `.toUpperCase())).join(' AND ')
  if (!pairs.length) {
    statement = columns.reduce(
      (store, item) => store + ` ${operator} `.toUpperCase() + item)
  }
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
    const statement = `${column} = ANY(${placeholderTag})`
    return { statement, values }
  },
  $contains: (args) => {
    const column = args[0].replace(columnTag, '')
    const values = [args.slice(1).flat()]
    const statement = `${column} @> ${placeholderTag}`
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
    const selection = await evaluate(args[1], environment)
    const projection = await evaluate(args[0], environment)
    const statement = `${selection.statement} WHERE ${projection.statement}`
    const values = [...selection.values, ...projection.values]
    return { statement, values }
  },
  $join: async (args, evaluate, environment) => {
    const join = await evaluate(args[0], environment)
    const on = await evaluate(args[1], environment)
    const selection = await evaluate(args[2], environment)
    const statement = (
      `${selection.statement} JOIN ${join.statement} ON ${on.statement}`)
    const values = [...selection.values, ...join.values, ...on.values]
    return { statement, values }
  },
  $group: async (args, evaluate, environment) => {
    const groups = []
    for (const element of args[0]) {
      groups.push(await evaluate(element, environment))
    }
    const projection = groups.map(
      group => `${group.replace(columnTag, '')}`).join(', ')
    const selection = await evaluate(args[1], environment)
    const statement = `${selection.statement} GROUP BY ${projection}`
    const values = selection.values
    return { statement, values }
  },
  $count: async (args, evaluate, environment) => {
    const field = await evaluate(args[0], environment)
    return `COUNT(${field})`
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
    const selection = await evaluate(args[1], environment)
    const condition = await evaluate(args[0], environment)
    const statement = `${selection.statement} HAVING ${condition.statement}`
    const values = [...condition.values, ...selection.values]
    return { statement, values }
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
    const projection = fields.map(
      field => `${field.replace(columnTag, '')}`).join(', ')
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
