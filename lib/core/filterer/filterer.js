import { Evaluator, Environment } from '../evaluator/index.js'

export class Filterer {
  constructor ({ evaluator = new Evaluator() } = {}) {
    this.evaluator = evaluator
  }

  parse (expression) {
    expression = expression?.length ? expression : true
    return (object) => {
      const environment = Environment({ ':': object })
      return this.evaluator.evaluate(expression, environment)
    }
  }
}
