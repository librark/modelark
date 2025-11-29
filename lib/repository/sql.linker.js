import { SqlParser } from '../core/index.js'
import { Linker } from './linker.js'

export class SqlLinker extends Linker {
  constructor ({ locator, connector }) {
    super()
    this.locator = locator
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

  async query (expression, context = null) {
    const location = this.locator.location()
    const collections = Object.fromEntries(
      this.repositories.map(repository => [
        repository.collection, `"${location}"."${repository.collection}"`]))
    const { mode, ...rest } = context ?? {}
    const [statement, parameters] = await this.parser.parse(
      expression, { ...rest, '@': collections })
    if (!statement) return parameters
    const connection = await this.connector.get()
    try {
      return await connection?.query(statement, { parameters, mode }) ?? null
    } finally {
      await this._release(connection)
    }
  }

  async _release (connection) {
    if (!connection) return
    return this.connector.put(connection)
  }
}
