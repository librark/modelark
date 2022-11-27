import { standardOperators } from './operators.js'

export class Lisper {
  constructor ({ operators = standardOperators } = {}) {
    this.operators = operators
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
