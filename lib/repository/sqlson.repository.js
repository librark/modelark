import { SqlRepository } from './sql.repository.js'

export class SqlsonRepository extends SqlRepository {
  constructor ({
    model, collection, locator, connector, parser, clock
  } = {}) {
    super({
      model, collection, locator, connector, parser, clock
    })
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

  _unpack (result) {
    return result.rows.map(item => item.data || item)
  }

  _tabulize (items) {
    const entries = items.map(item => ({ id: item.id, data: item }))
    return super._tabulize(entries)
  }

  _type (type) {
    return {
      string: 'text',
      number: 'numeric',
      boolean: 'boolean'
    }[type] || 'text'
  }

  _expand (location) {
    let entries = null
    if (this.model.augmented) {
      entries = Object.entries(this.model.fields).map(
        ([field, { type }]) => [field, type])
    } else {
      const Constructor = this.model
      const template = new Constructor()
      entries = Object.entries(template).map(
        ([field, value]) => [field, typeof value])
    }

    const structure = entries.map(
      ([field, type]) => `"${field}" ${this._type(type)}`).join(', ')

    const subquery = (
      `SELECT x.* FROM "${location}"."${this.collection}", ` +
      `jsonb_to_record("data") AS x(${structure})`)

    return `(${subquery})`
  }
}
