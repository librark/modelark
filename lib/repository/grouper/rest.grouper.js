import { RestRepository } from '../rest.repository.js'
import { Grouper } from './grouper.js'

export class RestGrouper extends Grouper {
  constructor ({ repository }) {
    super()
    this.set(repository)
    this.operations = [
      'count', 'max', 'min', 'sum', 'avg'
    ]
  }

  set (repository) {
    if (!(repository instanceof RestRepository)) {
      throw Error(`RestGrouper requires a RestRepository. Got ${repository}.`)
    }
    this.repository = repository
    return this
  }

  async group ({ domain = [], groups = [], aggregations = [] } = {}) {
    const connector = this.repository.connector
    const parameters = new URLSearchParams()
    if (domain.length) {
      parameters.append('filter', JSON.stringify(domain))
    }

    if (groups.length) {
      parameters.append('groups', groups.map(
        item => item.trim()).join(',').toLowerCase())
    }

    if (aggregations.length) {
      parameters.append('aggregations', aggregations.map(
        item => item.trim()).join(',').toLowerCase())
    }

    let statement = this._endpoint()
    statement = [
      statement, parameters.toString()].filter(Boolean).join('?')

    const method = 'GET'
    const options = { method }

    const connection = await connector.get()

    return this._unpack(await connection.query(statement, { options }))
  }

  _endpoint () {
    const host = this.repository.host
    const collection = this.repository.collection
    return `${host}/aggregation/${collection.toLowerCase()}`
  }

  _unpack (result) {
    return result?.data || []
  }
}
