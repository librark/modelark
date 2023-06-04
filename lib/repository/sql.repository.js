import { SqlParser } from '../core/index.js'
import { Repository } from './repository.js'

export class SqlRepository extends Repository {
  constructor ({
    model, collection, locator, connector, parser, clock, constraints
  } = {}) {
    super()
    this.locator = locator
    this.connector = connector
    this._model = model
    this._collection = collection || model?.constructor.name
    this.parser = parser || new SqlParser({ tables: [this._collection] })
    this.clock = clock || (() => new Date())
    this._constraints = constraints
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

    const result = this._unpack(
      await connection.query(statement, { parameters }))

    const Constructor = this.model.constructor
    items = result.map(item => new Constructor(item))

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

    const result = this._unpack(
      await connection.query(statement, { parameters }))
    const index = Object.fromEntries(result.map(item => [item.id, item]))
    const Constructor = this.model.constructor

    items = items.map(
      item => index[item.id] ? new Constructor(index[item.id]) : null)

    return isArray ? items : items.pop() || null
  }

  /** @param {Array<Any>} expression
   * @return {Promise<Array<object>>} */
  async query (expression) {
    await this._init()
    const connection = await this.connector.get()
    const location = this.locator.location()
    const context = {
      '@': { [this.collection]: this._expand(location) }
    }
    const [statement, parameters] = (
      await this.parser.parse(expression, context))
    return this._unpack(await connection.query(statement, { parameters }))
  }

  /** @param {Array<Any>} condition
   *  @param {{
   *    limit: number | null, offset: number | null, order: string | null
   *  }}
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  // async search (condition = [], {
  // limit = null, offset = null, order = null
  // } = {}) {
  // await this._init()

  // const connection = await this.connector.get()

  // const { statement, parameters } = await this.build(
  // condition, { limit, offset, order })

  // const result = this._unpack(
  // await connection.query(statement, { parameters }))
  // const Constructor = this.model.constructor

  // return result.map(item => new Constructor(item))
  // }

  async build (condition) {
    const location = this.locator.location()
    let clause = '1 = 1'
    let parameters = []
    if (condition.length) {
      ;[clause, parameters] = await this.parser.parse(condition)
    }
    const statement = `
    SELECT * FROM ${this._expand(location)}
    WHERE ${clause}
    `.trim()

    return { statement, parameters }
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

  _type (value) {
    return {
      string: 'text',
      number: 'numeric',
      boolean: 'boolean'
    }[typeof value] || 'text'
  }

  _expand (location) {
    return `"${location}"."${this.collection}"`
  }
}
