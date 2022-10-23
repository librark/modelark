import { RepositoryInterface } from './interface.js'

export class Repository extends RepositoryInterface {
  /** @param {Object | Array<Object>} items
    * @return { Entity | Array<Entity> } */
  create (attributes = {}) {
    const isObject = attributes?.constructor === Object
    attributes = [attributes].flat()
    const result = attributes.map(item => new this.model.constructor(item))
    return isObject ? result.pop() : result
  }

  /** @param {Object | Array<Object>} values @return {Array<Entity>} */
  async find (values, { field = 'id', init = false } = {}) {
    values = [values].flat()
    const records = values.map(
      value => Object(value) === value ? value : { [field]: value })
    const entities = await this.search(
      [[field, 'in', records.map(record => record[field])]])
    const index = Object.fromEntries(entities.map(
      entity => [entity[field], entity]))
    const Constructor = this.model.constructor

    return records.map(record => index[record[field]] || (
      init ? new Constructor(record) : null))
  }
}
