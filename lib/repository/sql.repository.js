import { SqlParser } from '../core/index.js'
import { Repository } from './repository.js'

export class SqlRepository extends Repository {
  constructor ({
    model, collection, locator, connector, parser, clock
  } = {}) {
    super()
    this._model = model
    this._collection = collection
    this.locator = locator
    this.connector = connector
    this.parser = parser || new SqlParser({ tables: [this._collection] })
    this.clock = clock || (() => new Date())
  }

  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async _add (items) {
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

    items = items.map(item => item.toStruct())
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

    const result = this._unpack(
      await connection.query(statement, { parameters }))

    const Constructor = this.model
    items = result.map(item => new Constructor(item))

    return isArray ? items : items.pop()
  }

  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async _remove (items) {
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

    const result = this._unpack(
      await connection.query(statement, { parameters }))
    const index = Object.fromEntries(result.map(item => [item.id, item]))
    const Constructor = this.model

    items = items.map(
      item => index[item.id] ? new Constructor(index[item.id]) : null)

    return isArray ? items : items.pop() || null
  }

  /** @param {Array<Any>} expression
   * @param {object?} context
   * @return {Promise<Array<object>>} */
  async query (expression, context = {}) {
    await this._init()
    const connection = await this.connector.get()
    const location = this.locator.location()
    const source = { '@': { [this.collection]: this._expand(location) } }
    const [statement, parameters] = (
      await this.parser.parse(expression, { ...context, ...source }))
    return this._unpack(await connection.query(statement, { parameters }))
  }

  async _init () {
    // Initialization Hook. Useful in subclasses.
  }

  _unpack (result) {
    return result.rows
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

  _expand (location) {
    return `"${location}"."${this.collection}"`
  }
}
