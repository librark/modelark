import { Evaluator, Environment, baseOperators } from '../evaluator/index.js'

export class Filterer {
  constructor ({ evaluator = new Evaluator() } = {}) {
    this.evaluator = evaluator
  }

  parse (expression) {
    expression = expression?.length ? expression : true
    return async (object) => {
      const environment = new Environment({
        ...baseOperators, ':': objectProxy(object)
      })
      return this.evaluator.evaluate(expression, environment)
    }
  }
}

const objectProxy = (object) => new Proxy(object, {
  get (target, property) {
    const value = target[property]
    if (value?.constructor === Date) return value.toISOString()
    return value
  }
})
