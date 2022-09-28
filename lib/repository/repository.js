import { RepositoryInterface } from './interface.js'

export class Repository extends RepositoryInterface {
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
