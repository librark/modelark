export function Environment (context = {}) {
  return { ...standardOperators, ...context }
}

const comparisonOperators = {
  '=': (...args) => args.every(value => value === args[0]),
  '!=': (...args) => !args.every(value => value === args[0]),
  '>': (...args) => args.slice(1).map(
    (value, index) => args[index] > value).every(Boolean),
  '<': (...args) => args.slice(1).map(
    (value, index) => args[index] < value).every(Boolean),
  '>=': (...args) => args.slice(1).map(
    (value, index) => args[index] >= value).every(Boolean),
  '<=': (...args) => args.slice(1).map(
    (value, index) => args[index] <= value).every(Boolean),
  $like: (...args) => args.slice(1).every(value => RegExp(
        `^${value}$`.replace(/%/g, '.*').replace(/_/g, '.')).test(args[0])),
  $ilike: (...args) => args.slice(1).every(
    value => RegExp(`^${value}$`.replace(/%/g, '.*').replace(
      /_/g, '.').toLowerCase()).test(args[0].toLowerCase())),
  $in: (...args) => args.slice(1).flat().includes(args[0]),
  $contains: (...args) => args.slice(1).every(
    value => args[0].includes(value))
}

const logicalOperators = {
  $and: (...args) => args.every(Boolean),
  $or: (...args) => args.some(Boolean),
  $not: (...args) => !args.every(Boolean)
}

const arithmeticOperators = {
  $time: (...args) => (new Date(args[0] || Date.now())).getTime(),
  '+': (...args) => args.reduce(
    (previous, current) => previous + current),
  '-': (...args) => args.reduce(
    (previous, current) => previous - current),
  '*': (...args) => args.reduce(
    (previous, current) => previous * current),
  '/': (...args) => args[0] / args.slice(1).reduce(
    (previous, current) => previous * current)
}

export const standardOperators = {
  ...comparisonOperators,
  ...logicalOperators,
  ...arithmeticOperators
}