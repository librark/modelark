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
  async _add (items) {
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
    const Constructor = this.model

    items = items.map(
      item => index[item.id] ? new Constructor(index[item.id]) : null)

    return isArray ? items : items.pop()
  }

  /** @param {Array<Any>} expression
   * @param {object?} context
   * @return {Promise<Array<object>>} */
  async query (expression, context = {}) {
    const connection = await this.connector.get()
    const path = this.settings.queryPath || '/query'
    const method = this.settings.queryMethod || 'POST'
    const statement = `${this.host}${path}`
    const body = JSON.stringify({ data: expression })
    const options = { method, body }
    return this._unpack(await connection.query(statement, { options }))
  }

  _unpack (result) {
    return result?.data || []
  }
}
