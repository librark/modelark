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

  /** @return {Object} */
  get state () {
    return this._state || null
  }

  with (state) {
    return Object.assign(Object.create(
      Object.getPrototypeOf(this)), this, { _state: state })
  }

  /** @param {Object | Array<Object>} items
    * @return { Entity | Array<Entity> } */
  create (attributes = {}) {
    const isArray = Array.isArray(attributes)
    attributes = [attributes].flat()
    const result = attributes.map(item => new this.model.constructor(item))
    return isArray ? result : result.pop()
  }

  /** @param {Object | Array<Object>} values
   *  @param {{ field: string, init: boolean }}
   * @return {Entity | Array<Entity>} */
  async find (values, { field = 'id', init = false } = {}) {
    const isArray = Array.isArray(values)
    values = [values].flat()
    const records = values.map(
      value => Object(value) === value ? value : { [field]: value })
    const entities = await this.search(
      [[field, 'in', records.map(record => record[field])]])
    const index = Object.fromEntries(entities.map(
      entity => [entity[field], entity]))
    const Constructor = this.model.constructor
    const result = records.map(record => index[record[field]] || (
      init ? new Constructor(record) : null))
    return isArray ? result : result.pop()
  }
}
