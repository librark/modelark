import { SqlFilterer } from '../core/filterer/index.js'
import { Repository } from './repository.js'

export class RestRepository extends Repository {
  constructor ({
    model, host, collection, locator, connector, clock
  } = {}) {
    super()
    this.locator = locator
    this.connector = connector
    this._model = model
    this._collection = collection || model?.constructor.name
    this.clock = clock || (() => new Date())
  }

  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async add (items) {
    const isArray = Array.isArray(items)
    items = [items].flat()
    if (!items.length) return []
    await this._init()

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

    return isArray ? items : items.pop()
  }

  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async remove (items) {
    const isArray = Array.isArray(items)
    items = [items].flat()
    if (!items.length) return []
    await this._init()

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

    return isArray ? items : items.pop()
  }

  /** @param {Array<Any>} domain
   *  @param {{
   *    limit: number | null, offset: number | null, order: string | null
   *  }}
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async search (domain = [], {
    limit = null, offset = null, order = null
  } = {}) {
    await this._init()

    const connection = await this.connector.get()

    const { statement, parameters } = this.build(
      domain, { limit, offset, order })

    const result = await connection.query(statement, parameters)
    const Constructor = this.model.constructor

    return result.map(item => new Constructor(item))
  }

  build (domain, { limit = null, offset = null, order = null } = {}) {
    const location = this.locator.location()
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

    return { statement, parameters }
  }

  async _init () {
    // Initialization Hook. Useful in subclasses.
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
