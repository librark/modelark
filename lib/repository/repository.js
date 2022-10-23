import { RepositoryInterface } from './interface.js'

export class Repository extends RepositoryInterface {
  /** @param {Object | Array<Object>} items
    * @return { Entity | Array<Entity> } */
  create (attributes = {}) {
    const isArray = Array.isArray(attributes)
    attributes = [attributes].flat()
    const result = attributes.map(item => new this.model.constructor(item))
    return isArray ? result : result.pop()
  }

  /** @param {Object | Array<Object>} values
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
