import { Repository } from './repository.js'

export class RestRepository extends Repository {
  constructor ({
    model, host, connector, locator, collection, settings, clock
  } = {}) {
    super()
    this.host = host
    this.connector = connector
    this.locator = locator
    this.settings = settings || {}
    this.clock = clock || (() => new Date())
    this._model = model
    this._collection = collection || model?.constructor.name
  }

  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async add (items) {
    const isArray = Array.isArray(items)
    items = [items].flat()
    if (!items.length) return []

    for (const item of items) {
      item.updatedAt = this.clock()
      item.updatedBy = this.locator.reference()
      item.createdAt = item.createdAt || item.updatedAt
      item.createdBy = item.createdBy || item.updatedBy
    }

    const connection = await this.connector.get()

    const method = this.settings.addMethod || 'PATCH'

    const headers = Object.assign({
      'Content-Type': 'application/json'
    }, this.settings.addHeaders)

    const body = JSON.stringify({ data: items.map(item => ({ ...item })) })

    const options = { method, headers, body }

    const statement = `${this.host}/${this.collection.toLowerCase()}`

    const result = await connection.query(statement, { options })

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

    await connection.query(statement, { parameters })

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
}
