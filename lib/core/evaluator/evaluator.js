import { Environment } from './environment.js'

export class Evaluator {
  constructor ({ namespaces = [] } = {}) {
    this.namespaces = [':', '@', ...namespaces]
  }

  evaluate (expression, environment = Environment()) {
    if (expression?.constructor === String) {
      if (this.namespaces.some(prefix => expression.startsWith(prefix))) {
        return environment[expression[0]][expression.slice(1)]
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
