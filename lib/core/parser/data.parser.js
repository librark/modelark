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

function parse (args) {
  if (!Array.isArray(args)) {
    if (args instanceof Date) return new Date(args).getTime()
    return args
  }
  if (!args.some(arg => (arg instanceof Date))) return args
  return args.map(arg => new Date(arg).getTime())
}

const comparisonOperators = {
  '=': (args) => parse(args).slice(1).every(
    value => value === parse(args[0])),
  '!=': (args) => !parse(args).slice(1).every(
    value => value === parse(args[0])),
  '>': (args) => parse(args).slice(1).map(
    (value, index) => parse(args[index]) > value).every(Boolean),
  '<': (args) => parse(args).slice(1).map(
    (value, index) => parse(args[index]) < value).every(Boolean),
  '>=': (args) => parse(args).slice(1).map(
    (value, index) => parse(args[index]) >= value).every(Boolean),
  '<=': (args) => parse(args).slice(1).map(
    (value, index) => parse(args[index]) <= value).every(Boolean),
  $like: (args) => args.slice(1).every(value => RegExp(
    `^${value}$`.replace(/%/g, '.*').replace(/_/g, '.')).test(args[0])),
  $ilike: (args) => args.slice(1).every(
    value => RegExp(`^${value}$`.replace(/%/g, '.*').replace(
      /_/g, '.').toLowerCase()).test(args[0]?.toLowerCase())),
  $in: (args) => (args[0] != null) && args.flat().slice(1).includes(args[0]),
  $contains: (args) => args.flat().slice(1).every(
    value => args[0]?.includes(value)),
  $isnull: (args) => args[0] == null
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
  $from: async (args) => {
    return args[0][1].map(
      item => ({ [args[0][0]]: item }))
  },
  $limit: async (args) => {
    let segment = args[0]
    if (segment.constructor === Number) {
      segment = { offset: 0, limit: segment }
    }
    return args[1].slice(segment.offset ?? 0, (
      (segment.offset ?? 0) + (segment.limit ?? Infinity)))
  },
  $extract: async (args, evaluate, environment) => {
    const [field, expression] = args
    let source = await evaluate(expression, environment)
    const epoch = new Date(0)
    if (field.toLowerCase() === 'epoch') {
      if (source instanceof Date) return (source.getTime() / 1000)
      return source / 1000
    }
    if (field.toLowerCase() === 'day') {
      if (source instanceof Date) return source.getUTCDate()
      return Math.round(source / (1000 * 60 * 60 * 24))
    }
    if (field.toLowerCase() === 'month') {
      if (source instanceof Date) return source.getUTCMonth() + 1
      source = new Date(source)
      return (source.getUTCMonth() - epoch.getUTCMonth() + (
        12 * (source.getUTCFullYear() - epoch.getUTCFullYear()))) % 12
    }
    if (field.toLowerCase() === 'year') {
      if (source instanceof Date) return source.getUTCFullYear()
      return 0
    }
    throw Error(`Field "${field}" is not implemented by $extract.`)
  }
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
  $row_number: async (args) => {
    return { __windowFunction__: { fn: '$row_number', args } }
  },
  $rank: async (args) => {
    return { __windowFunction__: { fn: '$rank', args } }
  },
  $dense_rank: async (args) => {
    return { __windowFunction__: { fn: '$dense_rank', args } }
  },
  $lag: async (args) => {
    return { __windowFunction__: { fn: '$lag', args } }
  },
  $lead: async (args) => {
    return { __windowFunction__: { fn: '$lead', args } }
  },
  $over: async (args, evaluate, environment) => {
    const window = environment['__window__:']
    if (!window || !Array.isArray(window.items)) {
      throw new Error('$over must be used inside a $select projection.')
    }

    const [fnExpression, options = {}] = args
    const { items, index: currentIndex } = window
    const orderSpecs = parseOrderSpecs(options.order ?? [])
    const frameSpec = normalizeFrame(options.frame, Boolean(orderSpecs.length))
    const partition = options.partition ?? []

    const decorated = []
    for (let index = 0; index < items.length; index++) {
      const rowContext = { ...items[index], __window__: { items, index } }
      const rowEnv = environment.surround(rowContext)
      const key = []
      for (const expr of partition) {
        key.push(await evaluate(expr, rowEnv))
      }
      const orderValues = []
      for (const spec of orderSpecs) {
        orderValues.push(await evaluate(spec.field, rowEnv))
      }
      decorated.push({
        row: items[index],
        index,
        partitionKey: JSON.stringify(key),
        orderValues
      })
    }

    const current = decorated[currentIndex]
    const partitionRows = decorated.filter(
      item => item.partitionKey === current.partitionKey)
    const sortedPartition = sortPartition(partitionRows, orderSpecs)
    const position = sortedPartition.findIndex(
      item => item.index === currentIndex)

    const startIndex = resolveBound(
      frameSpec.start, position, sortedPartition.length, false)
    const endIndex = resolveBound(
      frameSpec.end, position, sortedPartition.length, true)

    const frameRows = startIndex <= endIndex
      ? sortedPartition.slice(startIndex, endIndex + 1)
      : []

    const expressionName = Array.isArray(fnExpression)
      ? fnExpression[0]
      : fnExpression
    let fn = expressionName
    let fnArgs = Array.isArray(fnExpression) ? fnExpression.slice(1) : []

    const windowFunctions = new Set([
      '$row_number', '$rank', '$dense_rank', '$lag', '$lead'])
    if (windowFunctions.has(expressionName)) {
      const descriptor = await evaluate(fnExpression, environment)
      fn = descriptor?.__windowFunction__?.fn ?? fn
      fnArgs = descriptor?.__windowFunction__?.args ?? fnArgs
    }

    const evaluateOnRow = async (rowInfo, expression) => {
      return evaluate(expression, environment.surround(
        { ...rowInfo.row, __window__: { items, index: rowInfo.index } }))
    }

    if (['$sum', '$avg', '$count', '$min', '$max'].includes(fn)) {
      const field = fn === '$count' ? fnArgs[0]?.replace('*', 'id') : fnArgs[0]
      let acc = fn === '$max'
        ? Number.NEGATIVE_INFINITY
        : fn === '$min'
          ? Number.POSITIVE_INFINITY
          : 0
      let count = 0
      for (const rowInfo of frameRows) {
        const value = await evaluateOnRow(rowInfo, field)
        if (value === null) continue
        count += 1
        if (fn === '$sum' || fn === '$avg') acc += value
        if (fn === '$count') acc += 1
        if (fn === '$min' && value < acc) acc = value
        if (fn === '$max' && value > acc) acc = value
      }
      if (fn === '$avg') return acc / count
      return acc
    }

    if (fn === '$row_number') return position + 1

    if (fn === '$rank' || fn === '$dense_rank') {
      if (!orderSpecs.length) return position + 1
      let rank = 1
      let unique = 1
      for (let i = 1; i <= position; i++) {
        const currentOrder = sortedPartition[i].orderValues
        const previousOrder = sortedPartition[i - 1].orderValues
        const sameOrder = JSON.stringify(currentOrder) === JSON.stringify(previousOrder)
        if (!sameOrder) {
          rank = i + 1
          unique += 1
        }
      }
      return fn === '$rank' ? rank : unique
    }

    if (fn === '$lag' || fn === '$lead') {
      const [expression, step = 1, defaultValue = null] = fnArgs
      const offset = step ?? 1
      const offsetIndex = fn === '$lag'
        ? position - offset
        : position + offset
      const target = sortedPartition[offsetIndex]
      if (!target) return defaultValue
      return evaluateOnRow(target, expression)
    }

    throw new Error(`Window function "${fn}" is not implemented.`)
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
  $filter: async (args, evaluate, environment) => {
    if (await evaluate(args[1], environment)) {
      return evaluate(args[0], environment)
    }
    return null
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
    const aggregates = args[0].some(hasAggregateOperator)
    if (!items[0]?.__items__ && aggregates) {
      items = [{ __items__: items }]
    }
    const rows = []
    for (const [index, item] of items.entries()) {
      const row = {}
      const { __groups__, ...content } = item
      for (const element of args[0]) {
        const result = await evaluate(element, environment.surround(
          { ...__groups__, ...content, __window__: { items, index } }))
        if (String(element).startsWith('$as')) {
          Object.assign(row, Object.fromEntries([result]))
          continue
        }
        const field = String(element).replace(':', '').replace('$', '')
        const key = field.split(',').shift()
        if (key.endsWith('*')) {
          const namespace = key.slice(0, -1)
          if (!namespace) {
            Object.assign(row, { ...item[Object.keys(item).shift()] })
            continue
          }
          const content = Object.fromEntries(Object.entries(
            item[namespace] ?? {}).map(([key, value]) => [
            [namespace, key].filter(Boolean).join(':'), value]))
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

function parseOrderSpecs (parts) {
  const entries = parts.map(part => part.constructor === Object
    ? Object.entries(part).pop()
    : [part, '$asc'])
  return entries.map(([field, direction]) => ({
    field,
    sign: direction?.toLowerCase() === '$desc' ? -1 : 1
  }))
}

function sortPartition (partition, specs) {
  if (!specs.length) {
    return [...partition].sort((left, right) => left.index - right.index)
  }
  return [...partition].sort((source, target) => specs.reduce(
    (previous, current, index) => {
      if (previous) return previous
      return JSON.stringify(source.orderValues[index]).localeCompare(
        JSON.stringify(target.orderValues[index]), undefined, { numeric: true }
      ) * current.sign
    }, 0) || (source.index - target.index))
}

function normalizeFrame (frame, ordered) {
  const defaultFrame = ordered
    ? { start: { type: 'unbounded' }, end: { type: 'current' } }
    : { start: { type: 'unbounded' }, end: { type: 'unbounded' } }
  if (!frame) return defaultFrame
  const hasStart = Object.prototype.hasOwnProperty.call(frame, 'start')
  const hasEnd = Object.prototype.hasOwnProperty.call(frame, 'end')
  return {
    start: normalizeBound(hasStart ? frame.start : defaultFrame.start),
    end: normalizeBound(hasEnd ? frame.end : defaultFrame.end)
  }
}

function normalizeBound (bound) {
  if (bound == null) return { type: 'current' }
  if (bound.constructor === Number) {
    return bound >= 0
      ? { type: 'following', offset: bound }
      : { type: 'preceding', offset: Math.abs(bound) }
  }
  if (bound.constructor === String) {
    const type = bound.toLowerCase()
    if (['unbounded', 'current'].includes(type)) return { type }
  }
  return bound
}

function resolveBound (bound, position, size, isEnd) {
  const { type, offset = 0 } = bound
  if (type === 'unbounded') return isEnd ? size - 1 : 0
  if (type === 'current') return position
  if (type === 'preceding') return Math.max(0, position - offset)
  if (type === 'following') return Math.min(size - 1, position + offset)
  return position
}

function hasAggregateOperator (expression) {
  if (expression?.constructor !== Array) return false
  const [operator, ...rest] = expression
  if (['$count', '$sum', '$avg', '$min', '$max'].includes(operator)) {
    return true
  }
  if (operator === '$over') return false
  return rest.some(hasAggregateOperator)
}
