import { Evaluator, Environment } from '../evaluator/index.js'

export class SqlFilterer {
  constructor ({ evaluator = new Evaluator() } = {}) {
    this.evaluator = evaluator
  }

  parse (expression, ambient = {}) {
    if (!expression?.length) {
      return ['1 = 1', []]
    }

    const environment = Environment(
      { ...sqlOperators, ':': namespaceProxy, '@': ambient })

    const result = this.evaluator.evaluate(expression, environment)

    if (!result.statement) {
      throw new Error('Query parsing error. Malformed filtering expression.')
    }

    const placeholders = result.statement.match(
      new RegExp(placeholderTag, 'g'))

    const statement = placeholders.reduce((
      store, item, index) => store.replace(
      item, `$${index + 1}`), result.statement)

    return [statement, result.values]
  }
}

const columnTag = '@column::'

const placeholderTag = '!#!'

const namespaceProxy = new Proxy({}, {
  get (_, property) {
    return `${columnTag}${property}`
  }
})

const combine = (leftArray, rightArray) => (
  leftArray.map((leftItem) => rightArray.map(
    (rightItem) => [leftItem, rightItem])).flat())

const operatorDecorator = (operator) => (...args) => {
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

const sqlOperators = {
  '=': operatorDecorator('='),
  '!=': operatorDecorator('!='),
  '>': operatorDecorator('>'),
  '<': operatorDecorator('<'),
  '>=': operatorDecorator('>='),
  '<=': operatorDecorator('<='),
  $like: operatorDecorator('like'),
  $ilike: operatorDecorator('ilike'),
  $in: (...args) => {
    const column = args[0].replace(columnTag, '')
    const values = [args.slice(1).flat()]
    const statement = `"${column}" = ANY(${placeholderTag})`
    return { statement, values }
  },
  $contains: (...args) => {
    const column = args[0].replace(columnTag, '')
    const values = [args.slice(1).flat()]
    const statement = `"${column}" @> ${placeholderTag}`
    return { statement, values }
  },
  $and: (...args) => {
    const statement = args.map(item => item.statement).join(' AND ')
    const values = args.map(item => item.values).flat()
    return { statement, values }
  },
  $or: (...args) => {
    const statement = args.map(item => item.statement).join(' OR ')
    const values = args.map(item => item.values).flat()
    return { statement, values }
  },
  $not: (...args) => {
    const statement = `NOT (${args.map(item => item.statement).join(' AND ')})`
    const values = args.map(item => item.values).flat()
    return { statement, values }
  }
}
