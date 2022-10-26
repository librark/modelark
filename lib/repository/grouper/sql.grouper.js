import { SqlRepository } from '../sql.repository.js'
import { Grouper } from './grouper.js'

export class SqlGrouper extends Grouper {
  constructor ({ repository }) {
    super()
    this.set(repository)
    this.operations = {
      count: (value) => `count("${value.trim()}")`,
      max: (value) => `max("${value.trim()}")`,
      min: (value) => `min("${value.trim()}")`,
      sum: (value) => `sum("${value.trim()}")`,
      avg: (value) => `avg("${value.trim()}")`
    }
  }

  set (repository) {
    if (!(repository instanceof SqlRepository)) {
      throw Error(`SqlGrouper requires a SqlRepository. Got ${repository}.`)
    }
    this.repository = repository
  }

  async group ({ domain = [], groups = [], aggregations = [] } = {}) {
    const connector = this.repository.connector
    let { statement, parameters } = this.repository.build(domain)
    const condition = statement.split('FROM').pop().trim()
    const grouping = groups.map(item => `"${item}"`).join(', ')

    const projection = aggregations.map(item => item.split(':')).map(
      ([operation, field]) => this.operations[operation.toLowerCase().trim()](
        field.trim())).join(', ')

    statement = `
    SELECT ${projection || 'count(*)'} FROM ${condition}
    ${grouping ? 'GROUP BY ' + grouping : ''}
    `
    const connection = await connector.get()

    return await connection.query(statement, parameters)
  }
}
