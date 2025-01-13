import { Evaluator, Environment, baseOperators } from '../evaluator/index.js'

export class SqlParser {
  constructor ({ tables = [] } = {}) {
    this.evaluator = new Evaluator()
    this.defaultProxy = {
      ':': namespaceProxy('')
    }
    this.locationProxy = {
      '@': Object.fromEntries(tables.map(table => [table, `"${table}"`]))
    }
    this.tableProxies = Object.fromEntries(
      tables.map(namespace => [`${namespace}:`, namespaceProxy(namespace)]))
    this.namespaces = {
      __namespaces__: [':', '@', '#', ...tables.map(table => `${table}:`)]
    }
  }

  async parse (expression, context = {}) {
    const environment = new Environment({
      ...sqlOperators,
      ':': namespaceProxy,
      ...this.defaultProxy,
      ...this.locationProxy,
      ...this.tableProxies,
      ...this.namespaces,
      ...context
    })

    const output = await this.evaluator.evaluate(expression, environment)

    const result = [output].flat().pop()

    if (!result.statement) return [null, output]

    const placeholders = result.statement.match(
      new RegExp(placeholderTag, 'g'))

    const statement = placeholders?.reduce((
      store, item, index) => store.replace(
      item, `$${index + 1}`), result.statement) || result.statement
    const values = result.values

    return [statement, values]
  }
}

export const columnTag = '@column::'
export const placeholderTag = '!#!'

export const namespaceProxy = (namespace) => new Proxy({}, {
  get (_, property) {
    const identifier = [namespace, property].filter(
      Boolean).map(item => item !== '*' ? `"${item}"` : '*').join('.')
    return columnTag + identifier
  }
})

const combine = (leftArray, rightArray) => (
  leftArray.map((leftItem) => rightArray.map(
    (rightItem) => [leftItem, rightItem])).flat())

const operatorDecorator = (operator) => (args) => {
  let columns = args.filter(
    arg => String(arg).includes(columnTag) || String(arg).includes('*'))
  let parameters = args.filter(arg => !columns.includes(arg))
  columns = columns.map(column => `${column.replace(columnTag, '')}`)
  if (!columns.length) {
    columns = parameters.slice(0, 1)
    parameters = parameters.slice(1)
  }
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

const arithmeticOperators = {
  '+': (args) => `(${args.join(' + ')})`,
  '-': (args) => `(${args.join(' - ')})`,
  '*': (args) => `(${args.join(' * ')})`,
  '/': (args) => `(${args.join(' / ')})`
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
  $isnull: (args) => {
    const column = args[0].replaceAll(columnTag, '')
    const values = args.slice(1).flat()
    const statement = `${column} IS NULL`
    return { statement, values }
  },
  $in: (args) => {
    const column = args[0].replaceAll(columnTag, '')
    const values = [args.slice(1).flat()]
    const statement = `${column} = ANY(${placeholderTag})`
    return { statement, values }
  },
  $contains: (args) => {
    const column = args[0].replaceAll(columnTag, '')
    const values = [args.slice(1).flat()]
    const statement = `${column} @> ${placeholderTag}`
    return { statement, values }
  },
  $and: (args) => {
    const statement = args.map(item => `(${item.statement})`).join(' AND ')
    const values = args.map(item => item.values).flat()
    return { statement, values }
  },
  $or: (args) => {
    const statement = args.map(item => `(${item.statement})`).join(' OR ')
    const values = args.map(item => item.values).flat()
    return { statement, values }
  },
  $not: (args) => {
    const statement = (
      `NOT (${args.map(item => `(${item.statement})`).join(' AND ')})`)
    const values = args.map(item => item.values).flat()
    return { statement, values }
  }
}

const lock = (mode) => {
  mode = mode === true ? 'update' : mode
  return {
    update: 'FOR UPDATE',
    share: 'FOR SHARE',
    nowait: 'FOR UPDATE NOWAIT',
    skip: 'FOR UPDATE SKIP LOCKED'
  }[mode.toLowerCase()]
}

const queryOperators = {
  $as: (args) => {
    let source = args[1]
    let values = []
    if (source.constructor !== String) {
      values = source.values
      source = `(${source.statement})`
    }
    const alias = args[0]
    return { statement: `${source} AS "${alias}"`, values }
  },
  $for: (args) => {
    let mode = null; [mode, ...args] = args
    return {
      statement: `${args[0].statement} ${lock(mode)}`, values: args[0].values
    }
  },
  $from: (args) => {
    return { statement: `FROM ${args[0].statement}`, values: args[0].values }
  },
  $limit: (args) => {
    let segment = args[0]
    if (segment.constructor === Number) {
      segment = { offset: 0, limit: segment }
    }

    let statement = args[1].statement
    if (segment.limit) statement += ` LIMIT ${placeholderTag}`
    if (segment.offset) statement += ` OFFSET ${placeholderTag}`

    const values = [
      ...args[1].values, ...[segment.limit, segment.offset].filter(Boolean)]
    return { statement, values }
  }
}

const macros = {
  $where: async (args, evaluate, environment) => {
    const selection = await evaluate(args[1], environment)
    if (!args[0]?.length) return selection
    const condition = await evaluate(args[0], environment)
    const statement = `${selection.statement} WHERE ${condition.statement}`
    const values = [...selection.values, ...condition.values]
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
  $leftJoin: async (args, evaluate, environment) => {
    const join = await evaluate(args[0], environment)
    const on = await evaluate(args[1], environment)
    const selection = await evaluate(args[2], environment)
    const statement = (
      `${selection.statement} LEFT JOIN ${join.statement} ON ${on.statement}`)
    const values = [...selection.values, ...join.values, ...on.values]
    return { statement, values }
  },
  $group: async (args, evaluate, environment) => {
    const groups = []
    for (const element of args[0]) {
      groups.push(await evaluate(element, environment))
    }
    const projection = groups.map(
      group => `${group.replaceAll(columnTag, '')}`).join(', ')
    const selection = await evaluate(args[1], environment)
    const statement = `${selection.statement} GROUP BY ${projection}`
    const values = selection.values
    return { statement, values }
  },
  $concat: async (args, evaluate, environment) => {
    const fields = []
    for (const element of args) {
      const field = await evaluate(element, environment)
      fields.push(field.startsWith(columnTag)
        ? `${field.replaceAll(columnTag, '')}`
        : `'${field}'`)
    }
    return `CONCAT(${fields.join(', ')})`
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
    for (let element of (args[0].length ? args[0] : [])) {
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
      field => `${field.replaceAll(columnTag, '')}`).join(', ')
    const selection = await evaluate(args[1], environment)
    let statement = selection.statement
    if (projection.length) statement += ` ORDER BY ${projection}`
    const values = selection.values
    return { statement, values }
  },
  $union: async (args, evaluate, environment) => {
    const subqueries = []
    if (args.length < 2) {
      return evaluate(args[0], environment)
    }
    for (const arg of args) {
      subqueries.push(await evaluate(arg, environment))
    }
    const statement = subqueries.map(
      subquery => `(${subquery.statement})`).join(' UNION ALL ')
    const values = subqueries.map(subquery => subquery.values).flat()
    return { statement, values }
  },
  $select: async (args, evaluate, environment) => {
    const fields = []
    for (const element of args[0]) {
      fields.push(await evaluate(element, environment))
    }
    const projection = fields.map(
      field => `${(field.statement ?? field).replaceAll(
        columnTag, '')}`).join(', ')
    const selection = await evaluate(args[1], environment)
    const statement = `SELECT ${projection} ${selection.statement}`
    const values = selection.values
    return { statement, values }
  }
}

export const sqlOperators = {
  ...baseOperators,
  ...comparisonOperators,
  ...arithmeticOperators,
  ...queryOperators,
  __macros__: { ...macros }
}
