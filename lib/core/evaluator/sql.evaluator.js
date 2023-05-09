import { sqlOperators, namespaceProxy } from './operators/sql.operators.js'
import { Evaluator } from './evaluator.js'

export class SqlEvaluator extends Evaluator {
  async evaluate (expression, environment) {
    // const namespaceProxies = Object.fromEntries(
    // this.namespaces.map(namespace => [namespace, namespaceProxy]))
    environment = { ...sqlOperators, ...environment, ':': namespaceProxy }
    return super.evaluate(expression, environment)
  }
}
