import { Repository } from './repository.js'

export class RestRepository extends Repository {
  constructor ({
    model, host, connector, collection, settings
  } = {}) {
    super()
    this.host = host
    this.connector = connector
    this.settings = settings || {}
    this._model = model
    this._collection = collection || model?.constructor.name
  }

  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async add (items) {
    const isArray = Array.isArray(items)
    items = [items].flat()
    if (!items.length) return []

    const statement = `${this.host}/${this.collection.toLowerCase()}`

    const method = this.settings.addMethod || 'PATCH'

    const headers = Object.assign({
      'Content-Type': 'application/json'
    }, this.settings.addHeaders)

    const body = JSON.stringify({ data: items.map(item => ({ ...item })) })

    const options = { method, headers, body }

    const connection = await this.connector.get()

    const result = this._unpack(
      await connection.query(statement, { options }))

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

    const result = this._unpack(
      await connection.query(statement, { options }))
    const index = Object.fromEntries(result.map(item => [item.id, item]))
    const Constructor = this.model.constructor

    items = items.map(
      item => index[item.id] ? new Constructor(index[item.id]) : null)

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
    const parameters = new URLSearchParams()
    if (domain.length) {
      parameters.append('filter', JSON.stringify(domain))
    }

    if (limit) {
      parameters.append('limit', limit)
    }

    if (offset) {
      parameters.append('offset', offset)
    }

    if (order) {
      parameters.append('order', JSON.stringify(order))
    }

    let statement = `${this.host}/${this.collection.toLowerCase()}`
    statement = [
      statement, parameters.toString()].filter(Boolean).join('?')

    const method = 'GET'

    const options = { method }

    const connection = await this.connector.get()

    const result = this._unpack(
      await connection.query(statement, { options }))
    const Constructor = this.model.constructor

    return result.map(item => new Constructor(item))
  }

  _unpack (result) {
    return result?.data || []
  }
}
