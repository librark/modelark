import { Evaluator, Environment } from '../core/index.js'
import { RepositoryInterface } from './interface.js'

export class Repository extends RepositoryInterface {
  checker = new Evaluator({ namespaces: ['@'] })

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

  /** @return {{ add: Array, remove: Array }} */
  get constraints () {
    const { add = [], remove = [] } = this._constraints || {}
    return { add, remove }
  }

  /** @return {Object} */
  get state () {
    return this._state || null
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
    const result = await this._add(items)
    this.check('add', items)
    return result
  }

  /** @param {Object | Array<Object>} items @returns {Promise<void>} */
  async check (operation, items) {
    items = [items].flat()
    const environment = new Environment({ '@': { items } })
    const constraints = this.constraints[operation]
    for (const constraint of constraints) {
      const condition = ['$not', this.checker.expand(
        constraint.condition, environment)]
      const nonconformities = await this.search(condition, { limit: 1 })
      const message = constraint.message || JSON.stringify(constraint)
      if (nonconformities.length) {
        await this.remove(items)
        throw new Error(message)
      }
    }
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
}
