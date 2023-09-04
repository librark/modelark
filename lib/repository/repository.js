import { RepositoryInterface } from './interface.js'

export class Repository extends RepositoryInterface {
  /** @return {Entity} */
  get model () {
    if (!this._model) {
      throw new Error('The repository "Entity" model has not been set.')
    }
    return this._model
  }

  /** @return {string} */
  get collection () {
    return this._collection || `${this.model.constructor.name}`
  }

  /** @return {object} */
  get state () {
    return this._state || null
  }

  /** @return {Array<object>} */
  get rejections () {
    return (this.model.constructor?.rejections || []).map(
      rejection => ({ operation: 'add', examine: 'before', ...rejection }))
  }

  /** @param {Object | Array<Object>} items
    * @return { Entity | Array<Entity> } */
  create (attributes = {}) {
    const isArray = Array.isArray(attributes)
    attributes = [attributes].flat()
    const result = attributes.map(
      item => new this.model.constructor({ ...item }))
    return isArray ? result : result.pop()
  }

  /** @returns {this} */
  with (state) {
    return Object.assign(Object.create(
      Object.getPrototypeOf(this)), this, { _state: state })
  }

  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async add (items) {
    await this._check('add', 'before', items)
    const result = this._add(items)
    await this._check('add', 'after', items, this._remove.bind(this))
    return result
  }

  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async remove (items) {
    await this._check('remove', 'before', items)
    const result = this._remove(items)
    await this._check('remove', 'after', items, this._add.bind(this))
    return result
  }

  /** @param {Array<Any>} condition
   *  @param {{limit?: number, offset?: number, order?: string}} segment
   * @return {Promise<Array<Entity>>} */
  async search (condition = [], {
    limit = null, offset = null, order = null
  } = {}) {
    const ordering = (order ?? '').split(',').map(
      part => part.trim().split(' ')).map(([field, way]) => (
      field ? { [`:${field}`]: `$${way ?? 'asc'}`.toLowerCase() } : '')
    ).filter(Boolean)

    const source = ['$as', this.collection, `@${this.collection}`]

    const expression = [
      '$select', [':*'],
      ['$limit', { limit, offset },
        ['$order', ordering,
          ['$where', condition,
            ['$from', source]]]]
    ]

    const items = await this.query(expression)

    const Constructor = this.model.constructor

    return items.map(item => new Constructor(item))
  }

  /** @param {Object | Array<Object>} values
   *  @param {{ field: string, init: boolean, many: boolean }}
   * @return {Entity | Array<Entity> | Array<Array<Entity>>} */
  async find (values, { field = 'id', init = false, many = false } = {}) {
    field = field.startsWith(':') ? field.slice(1) : field
    const isArray = Array.isArray(values)
    values = [values].flat()
    const records = values.map(
      value => Object(value) === value ? value : { [field]: value })
    const entities = await this.search(
      ['$in', `:${field}`, ...records.map(record => record[field])])
    const index = entities.reduce((object, item) => {
      const key = item[field]
      if (!object[key]) object[key] = []
      object[key].push(item)
      return object
    }, {})
    const Constructor = this.model.constructor
    let result = records.map(record => index[record[field]] ?? (
      init ? [new Constructor(record)] : []))
    result = many ? result : result.map(item => item.pop() ?? null)
    return isArray ? result : result.pop()
  }

  /** @param {Object | Array<Object>} values
   *  @param {{ field: string }}
   * @return {Entity | Array<Entity>} */
  async ensure (values, { field }) {
    const entities = await this.find(values, { field, init: true })
    return this.add(entities)
  }

  load (items) {
    throw new Error(
      'This optional method has not ' +
      `been implemented by subclass "${this.constructor.name}"`)
  }

  async _check (operation, examine, items, compensate = null) {
    const rejections = this.rejections.filter(
      rejection => rejection.operation === operation)
    for (const rejection of rejections.filter(
      rejection => rejection.examine === examine)) {
      const expression = rejection.expression
      if (rejection.list) {
        const context = { '#': { items } }
        const selections = await this.query(rejection.expression, context)
        if (selections.length) {
          compensate && await compensate(items)
          throw new Error(rejection.message)
        }
      } else {
        const context = { '#': { items } }
        const selections = await this.query(rejection.expression, context)
        if (selections.length) {
          compensate && await compensate(items)
          throw new Error(rejection.message)
        }
      }
    }
  }
}
