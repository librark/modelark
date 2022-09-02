import { SqlRepository } from './sql.repository.js'

export class SqlsonRepository extends SqlRepository {
  constructor ({
    model, collection, locator, connector, filterer, clock
  } = {}) {
    super({ model, collection, locator, connector, filterer, clock })
    this.initialized = new Set()
  }

  async _init () {
    const location = this.locator.location()
    if (this.initialized.has(location)) return

    const statement = `
    CREATE TABLE IF NOT EXISTS "${location}"."${this.collection}" (
    "id" UUID PRIMARY KEY,
    "data" JSONB);
    `.trim()

    const connection = await this.connector.get()
    await connection.query(statement)
    this.initialized.add(location)
  }

  _tabulize (items) {
    const entries = items.map(item => ({ id: item.id, data: item }))
    return super._tabulize(entries)
  }

  _expand (location) {
    const structure = Object.entries(this.model).map(
      pair => `"${pair[0]}" ${this._type(pair[1])}`).join(', ')

    const subquery = `
    SELECT x.* FROM "${location}"."${this.collection}",
    jsonb_to_record("data") AS x(${structure})`.trim()

    return `(${subquery}) AS subquery`
  }
}
