import { RepositoryInterface } from './interface.js'

export class Repository extends RepositoryInterface {
  /** @return {new () => Entity} */
  get model () {
    if (!this._model) {
      throw new Error('The repository "Entity" model has not been set.')
    }
    if (typeof this._model === 'function') {
      return this._model
    }
    return this._model.constructor
  }

  /** @return {string} */
  get collection () {
    return this._collection || `${this.model.name}`
  }

  /** @return {object} */
  get state () {
    return this._state || null
  }

  /** @return {Array<object>} */
  get rejections () {
    return (this.model.rejections || []).map(
      rejection => ({
        operation: 'add',
        examine: 'before',
        message: 'Operation rejected.',
        condition: [],
        expression: [],
        ...rejection
      }))
  }

  /** @param {Object | Array<Object>} items
    * @return { Entity | Array<Entity> } */
  create (attributes = {}) {
    const isArray = Array.isArray(attributes)
    attributes = [attributes].flat()
    const Constructor = this.model
    const result = attributes.map(
      item => new Constructor({ ...item }))
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
   *  @param {{
   *  limit?: number, offset?: number, order?: string, lock?: string
   *  }} segment
   * @return {Promise<Array<Entity>>} */
  async search (condition = [], {
    limit = null, offset = null, order = null, lock = null
  } = {}) {
    const ordering = (order ?? '').split(',').map(
      part => part.trim().split(' ')).map(([field, way]) => (
      field ? { [`:${field}`]: `$${way ?? 'asc'}`.toLowerCase() } : '')
    ).filter(Boolean)

    const source = ['$as', this.collection, `@${this.collection}`]

    let expression = [
      '$select', [':*'],
      ['$limit', { limit, offset },
        ['$order', ordering,
          ['$where', condition,
            ['$from', source]]]]
    ]

    expression = lock ? ['$for', lock, expression] : expression

    const items = await this.query(expression)

    const Constructor = this.model

    return items.map(item => new Constructor(item))
  }

  /** @param {Object | Array<Object>} values
   *  @param {{ field: string, init: boolean, lock: string, many: boolean }}
   * @return {Entity | Array<Entity> | Array<Array<Entity>>} */
  async find (values, {
    field = 'id', init = false, lock = null, many = false
  } = {}) {
    field = field.startsWith(':') ? field.slice(1) : field
    const isArray = Array.isArray(values)
    values = [values].flat()
    const records = values.map(
      value => Object(value) === value ? value : { [field]: value })
    const entities = await this.search(
      ['$in', `:${field}`, ...records.map(record => record[field])], { lock })
    const index = entities.reduce((object, item) => {
      const key = item[field]
      if (!object[key]) object[key] = []
      object[key].push(item)
      return object
    }, {})
    const Constructor = this.model
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

  load (_items) {
    throw new Error(
      'This optional method has not ' +
      `been implemented by subclass "${this.constructor.name}"`)
  }

  async _check (operation, examine, items, compensate = null) {
    items = [items].flat()
    const rejections = this.rejections.filter(
      rejection => rejection.operation === operation)
    for (const rejection of rejections.filter(
      rejection => rejection.examine === examine)) {
      const context = { '#': { items } }
      let expression = rejection.expression
      if (rejection.condition.length) {
        expression = [
          '$select', [':*'],
          ['$where', rejection.condition,
            ['$from', ['$as', `${this.collection}`, `@${this.collection}`]]]
        ]
      }
      const selections = await this.query(expression, context)
      if (selections.length) {
        compensate && await compensate(items)
        throw new Error(rejection.message)
      }
    }
  }
}
