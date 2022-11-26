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
      $not: (...args) => !args.every(Boolean)
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
      return expression
    }
    const [operator, ...args] = expression
    const values = args.map(arg => this.evaluate(arg, environment))
    return environment[operator](...values)
  }
}
