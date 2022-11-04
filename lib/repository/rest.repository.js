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

    const statement = `${this.host}/${this.collection.toLowerCase()}`

    const method = this.settings.addMethod || 'PATCH'

    const headers = Object.assign({
      'Content-Type': 'application/json'
    }, this.settings.addHeaders)

    const body = JSON.stringify({ data: items.map(item => ({ ...item })) })

    const options = { method, headers, body }

    const connection = await this.connector.get()

    const result = await connection.query(statement, { options })

    return isArray ? items : items.pop()
  }

  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async remove (items) {
    const isArray = Array.isArray(items)
    items = [items].flat()
    if (!items.length) return []

    const ids = items.map(item => item.id)

    let statement = `${this.host}/${this.collection.toLowerCase()}`
    if (ids.length === 1) {
      statement += `/${ids.slice().pop()}`
    } else {
      statement += `?ids=${ids.join(',')}`
    }

    const method = 'DELETE'

    const options = { method }

    const connection = await this.connector.get()

    await connection.query(statement, { options })

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
    let statement = `${this.host}/${this.collection.toLowerCase()}`
    if (domain.length) {
      const filter = JSON.stringify(domain)
      statement += '?' + new URLSearchParams({ filter })
    }

    const method = 'GET'

    const options = { method }

    const connection = await this.connector.get()

    const result = await connection.query(statement, { options })
    const Constructor = this.model.constructor

    // return result.map(item => new Constructor(item))
  }
}
