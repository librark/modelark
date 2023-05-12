import { SqlParser } from '../core/index.js'
import { Linker } from './linker.js'

export class SqlLinker extends Linker {
  constructor ({ connector } = {}) {
    super()
    this.connector = connector
    this.repositories = []
    this.parser = null
  }

  setup (respositories) {
    this.repositories = respositories
    const tables = this.repositories.map(
      repository => repository.collection)
    this.parser = new SqlParser({ tables })
    return this
  }

  async query (expression) {
    const collections = Object.fromEntries(this.repositories.map(
      repository => [repository.collection, repository.collection]))
    const [statement, parameters] = await this.parser.parse(
      expression, { '@': collections })
    const connection = await this.connector.get()

    return this._unpack(await connection.query(statement, { parameters }))
  }

  _unpack (result) {
    return result.rows
  }
}
