import { Evaluator, Environment } from '../evaluator/index.js'

export class Filterer {
  constructor ({ evaluator = new Evaluator() } = {}) {
    this.evaluator = evaluator
  }

  parse (expression, ambient = {}) {
    expression = expression?.length ? expression : true
    return (object) => {
      const environment = Environment(
        { ':': objectProxy(object), '@': ambient })
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
