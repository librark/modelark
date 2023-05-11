import {
  sqlOperators, namespaceProxy, placeholderTag
} from './operators/sql.operators.js'
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

    const result = await super.evaluate(expression, environment)
    if (!result.statement) return result

    const placeholders = result.statement.match(
      new RegExp(placeholderTag, 'g'))
    const statement = placeholders?.reduce((
      store, item, index) => store.replace(
      item, `$${index + 1}`), result.statement) || result.statement
    const values = result.values

    return { statement, values }
  }
}
