export class Lisper {
  constructor () {
    this.operators = {
      '=': (...args) => args.every(value => value === args[0]),
      '!=': (...args) => !args.every(value => value === args[0]),
      '>': (...args) => args.slice(1).map(
        (value, index) => value > args[index]),
      '<': (...args) => args.slice(1).map(
        (value, index) => value < args[index]),
      '>=': (...args) => args.slice(1).map(
        (value, index) => value >= args[index]),
      '<=': (...args) => args.slice(1).map(
        (value, index) => value <= args[index]),
      $and: (...args) => args.every(Boolean),
      $or: (...args) => args.some(Boolean),
      $not: (...args) => !args.every(Boolean),
      $in: (...args) => args.slice(1).flat().includes(args[0]),
      $contains: (...args) => args.slice(1).every(
        value => args[0].includes(value)),
      $like: (...args) => args.slice(1).every(value => RegExp(
        `^${value}$`.replace(/%/g, '.*').replace(/_/g, '.')).test(args[0])),
      $ilike: (...args) => args.slice(1).every(
        value => RegExp(`^${value}$`.replace(/%/g, '.*').replace(
          /_/g, '.').toLowerCase()).test(args[0].toLowerCase()))
    }
  }

  parse (expression) {
    return (object) => {
      const environment = { ...this.operators, ':': object }
      return this.evaluate(expression, environment)
    }
  }

  evaluate (expression, environment) {
    if (expression?.constructor === String) {
      if (expression.startsWith(':')) {
        return environment[':'][expression.slice(1)]
      }
      return expression
    } else if (expression?.constructor !== Array) {
      if (expression?.constructor === Object && ('' in expression)) {
        return expression['']
      }
      return expression
    }
    const [operator, ...args] = expression
    const values = args.map(arg => this.evaluate(arg, environment))
    return environment[operator](...values)
  }
}
