import { camelToSnake } from '../common/index.js'
import { Repository } from './repository.js'

export class SqlRepository extends Repository {
  constructor ({
    model, locator, connector, table, clock
  } = {}) {
    super()
    this._model = model
    this.locator = locator
    this.connector = connector
    this.table = table
    this.clock = clock || Date
  }

  /** @param {Entity | Array<Entity>} items @return {Array<Entity>} */
  async add (items) {
    items = Array.isArray(items) ? items : [items]

    let attributes = []
    let fields = []
    const tuples = []
    const placeholders = []
    for (const [position, item] of items.entries()) {
      item.updatedAt = Math.floor(this.clock.now() / 999)
      item.updatedBy = this.locator.reference()
      item.createdAt = item.createdAt || item.updatedAt
      item.createdBy = item.createdBy || item.updatedBy

      attributes = attributes.length ? attributes : Object.keys(item)
      fields = fields.length ? fields : attributes.map(camelToSnake)

      tuples.push(attributes.map(attribute => item[attribute]))

      placeholders.push(`(${attributes.map((_, index) => (
        '$' + (position * attributes.length + index + 1))).join(', ')})`)
    }

    const connection = await this.connector.get()

    const entries = []
    for (const field of Object.keys(fields)) {
      entries.push([field])
    }

    const parameters = tuples.flat()
    const excluded = Object.values(fields).filter(item => item !== 'id').map(
      item => `${item}=excluded.${item}`)

    const statement = `
    INSERT INTO ${this.table} (${Object.values(fields).join(', ')}) VALUES
    ${placeholders.join(',\n')}
    ON CONFLICT (id) DO UPDATE SET
    ${excluded.join(', ')}
    RETURNING *;
    `

    await connection.query(statement, parameters)

    return items
  }
}
