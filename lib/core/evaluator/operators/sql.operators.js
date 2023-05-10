import { baseOperators } from './base.operators.js'

const columnTag = '@column::'

const placeholderTag = '!#!'

export const namespaceProxy = (namespace) => new Proxy({}, {
  get (_, property) {
    const identifier = [namespace, property].filter(
      Boolean).map(item => `"${item}"`).join('.')
    return columnTag + identifier
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
    let statement = `${args[1].statement} LIMIT ${placeholderTag}`
    statement = (
      segment.offset ? statement + ` OFFSET ${placeholderTag}` : statement)
    const values = [
      ...args[1].values, ...[segment.limit, segment.offset].filter(Boolean)]
    return { statement, values }
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
    const field = await evaluate(args[0], environment)
    return `SUM(${field})`
  },
  $avg: async (args, evaluate, environment) => {
    const field = await evaluate(args[0], environment)
    return `AVG(${field})`
  },
  $max: async (args, evaluate, environment) => {
    const field = await evaluate(args[0], environment)
    return `MAX(${field})`
  },
  $min: async (args, evaluate, environment) => {
    const field = await evaluate(args[0], environment)
    return `MIN(${field})`
  },
  $having: async (args, evaluate, environment) => {
    const selection = await evaluate(args[1], environment)
    const condition = await evaluate(args[0], environment)
    const statement = `${selection.statement} HAVING ${condition.statement}`
    const values = [...condition.values, ...selection.values]
    return { statement, values }
  },
  $order: async (args, evaluate, environment) => {
    const fields = []
    for (let element of args[0]) {
      let direction = ''
      if (element.constructor === Object) {
        direction = Object.values(element).pop().replace(
          '$desc', 'DESC').replace('$asc', 'ASC')
        element = Object.keys(element).pop()
      }
      element = await evaluate(element, environment)
      fields.push([element, direction].filter(Boolean).join(' '))
    }
    const projection = fields.map(
      field => `${field.replace(columnTag, '')}`).join(', ')
    const selection = await evaluate(args[1], environment)
    const statement = `${selection.statement} ORDER BY ${projection}`
    const values = selection.values
    return { statement, values }
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
