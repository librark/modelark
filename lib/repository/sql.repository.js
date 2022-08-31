import { SqlFilterer } from '../common/filterer/index.js'
import { Repository } from './repository.js'

export class SqlRepository extends Repository {
  constructor ({
    model, collection, locator, connector, filterer, clock
  } = {}) {
    super()
    this.locator = locator
    this.connector = connector
    this._model = model
    this._collection = collection || model?.name
    this.filterer = filterer || new SqlFilterer()
    this.clock = clock || (() => new Date())
  }

  /** @param {Entity | Array<Entity>} items @return {Array<Entity>} */
  async add (items) {
    items = Array.isArray(items) ? items : [items]
    if (!items.length) return []

    for (const item of items) {
      item.updatedAt = this.clock()
      item.updatedBy = this.locator.reference()
      item.createdAt = item.createdAt || item.updatedAt
      item.createdBy = item.createdBy || item.updatedBy
    }

    const { attributes, tuples, placeholders } = this._tabulize(items)

    const location = this.locator.location()
    const connection = await this.connector.get()

    const columns = attributes.map(field => `"${field}"`).join(', ')
    const excluded = attributes.filter(item => item !== 'id').map(
      item => `"${item}"=excluded."${item}"`)
    const parameters = tuples.flat()

    const statement = `
    INSERT INTO "${location}"."${this.collection}" (${columns}) VALUES
    ${placeholders.join(',\n')}
    ON CONFLICT (id) DO UPDATE SET
    ${excluded.join(', ')}
    RETURNING *;
    `.trim()

    await connection.query(statement, parameters)

    return items
  }

  _tabulize (items) {
    const tuples = []
    const placeholders = []
    const attributes = Object.keys(items[0])
    for (const [position, item] of items.entries()) {
      tuples.push(attributes.map(attribute => item[attribute]))
      placeholders.push(`(${attributes.map((_, index) => (
        '$' + (position * attributes.length + index + 1))).join(', ')})`)
    }
    return { attributes, tuples, placeholders }
  }

  /** @param {Entity | Array<Entity>} items @return {Array<Entity>} */
  async remove (items) {
    items = Array.isArray(items) ? items : [items]
    if (!items.length) return []

    const location = this.locator.location()
    const connection = await this.connector.get()

    const parameters = items.map(item => item.id)
    const placeholders = items.map((_, index) => `$${index + 1}`)

    const statement = `
    DELETE FROM "${location}"."${this.collection}"
    WHERE "id" IN (${placeholders.join(', ')})
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
    if (order) {
      order = this._order(order)
    }

    const statement = `
    SELECT * FROM ${this._expand(location)}
    WHERE ${condition}
    ${order ? 'ORDER BY ' + order : ''}
    ${limit ? 'LIMIT ' + limit : ''}
    ${offset ? 'OFFSET ' + offset : ''}
    `.trim()

    const result = await connection.query(statement, parameters)
    const Constructor = this.model.constructor

    return result.map(item => new Constructor(item))
  }

  _type (value) {
    return {
      string: 'text',
      number: 'numeric',
      boolean: 'boolean'
    }[typeof value] || 'text'
  }

  _order (order) {
    const terms = order.split(',').map(tuple => tuple.trim().split(' '))
    return terms.map(pair => `"${pair[0]}" ${pair.slice(1)}`).join(', ')
  }

  _expand (location) {
    return `"${location}"."${this.collection}"`
  }
}
