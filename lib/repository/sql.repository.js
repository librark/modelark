import { camelToSnake } from '../common/index.js'
import { SqlFilterer } from '../common/filterer/index.js'
import { Repository } from './repository.js'

export class SqlRepository extends Repository {
  constructor ({
    model, collection, locator, connector, filterer, clock
  } = {}) {
    super()
    this._model = model
    this._collection = collection
    this.locator = locator
    this.connector = connector
    this.filterer = filterer || new SqlFilterer()
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

    const location = this.locator.location()

    const connection = await this.connector.get()

    const entries = []
    for (const field of Object.keys(fields)) {
      entries.push([field])
    }

    const parameters = tuples.flat()
    const excluded = Object.values(fields).filter(item => item !== 'id').map(
      item => `${item}=excluded.${item}`)
    const columns = `${Object.values(fields).join(', ')}`

    const statement = `
    INSERT INTO ${location}.${this.collection} (${columns}) VALUES
    ${placeholders.join(',\n')}
    ON CONFLICT (id) DO UPDATE SET
    ${excluded.join(', ')}
    RETURNING *;
    `.trim()

    await connection.query(statement, parameters)

    return items
  }

  /** @param {Entity | Array<Entity>} items @return {Array<Entity>} */
  async remove (items) {
    items = Array.isArray(items) ? items : [items]
    const location = this.locator.location()

    const connection = await this.connector.get()

    const parameters = items.map(item => item.id)
    const placeholders = items.map((_, index) => `$${index + 1}`)

    const statement = `
    DELETE FROM ${location}.${this.collection}
    WHERE id IN (${placeholders.join(', ')})
    RETURNING *;
    `.trim()

    await connection.query(statement, parameters)

    return items
  }

  /** @param { Array<Any> } domain
   *  @param {{
   *    limit: number | null, offset: number | null, order: string | null
   *  }}
   * @return {Array<Entity>} */
  async search (domain, { limit = null, offset = null, order = null } = {}) {
    const location = this.locator.location()
    const connection = await this.connector.get()

    const [condition, parameters] = this.filterer.parse(domain)

    const statement = `
    SELECT * FROM ${location}.${this.collection}
    WHERE ${condition}
    ${order ? 'ORDER BY ' + camelToSnake(order) : ''}
    ${limit ? 'LIMIT ' + limit : ''}
    ${offset ? 'OFFSET ' + offset : ''}
    `.trim()

    const result = await connection.query(statement, parameters)

    return result.map(item => new this._model(item))
  }
}
