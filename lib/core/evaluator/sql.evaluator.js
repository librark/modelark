import { sqlOperators, namespaceProxy } from './operators/sql.operators.js'
import { Evaluator } from './evaluator.js'

export class SqlEvaluator extends Evaluator {
  constructor ({ tables }) {
    const namespaces = [':', '@', ...tables.map(table => `${table}:`)]
    super({ namespaces })
    this.defaultProxy = {
      ':': namespaceProxy('')
    }
    this.locationProxy = {
      '@': Object.fromEntries(tables.map(table => [table, table]))
    }
    this.tableProxies = Object.fromEntries(
      tables.map(namespace => [`${namespace}:`, namespaceProxy(namespace)]))
  }

  async evaluate (expression, environment) {
    environment = {
      ...sqlOperators,
      ...environment,
      ...this.defaultProxy,
      ...this.locationProxy,
      ...this.tableProxies
    }
    return super.evaluate(expression, environment)
  }
}
