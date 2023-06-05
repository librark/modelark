import {
  Entity, DefaultLocator, MemoryStorer, Sorter, DataParser
} from '../core/index.js'
import { Repository } from './repository.js'

export class MemoryRepository extends Repository {
  constructor ({
    model = new Entity(),
    locator = new DefaultLocator(),
    parser = new DataParser(),
    storer = new MemoryStorer(),
    sorter = new Sorter(),
    clock = null,
    constraints = {}
  } = {}) {
    super()
    this._model = model
    this.locator = /** @type {Locator} */ (locator)
    this.clock = clock || (() => new Date())
    this.parser = parser
    this.storer = storer
    this.sorter = sorter
    this._constraints = constraints
  }

  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async _add (items) {
    const isArray = Array.isArray(items)
    items = [items].flat()
    const location = this.locator.location()
    const data = await this.storer.retrieve(location)

    for (const item of items) {
      item.updatedAt = this.clock()
      item.updatedBy = this.locator.reference()
      item.createdAt = item.createdAt || item.updatedAt
      item.createdBy = item.createdBy || item.updatedBy
      data[item.id] = item
    }

    await this.storer.store(location, data)

    return isArray ? items : items.pop()
  }

  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async _remove (items) {
    const isArray = Array.isArray(items)
    items = [items].flat()
    const location = this.locator.location()
    const data = await this.storer.retrieve(location)

    const result = []
    for (const item of items) {
      result.push(data[item.id] || null)
      delete data[item.id]
    }

    await this.storer.store(location, data)

    return isArray ? result : result.pop()
  }

  /** @param {Array<Any>} expression
   * @param {object?} context
   * @return {Promise<Array<object>>} */
  async query (expression, context = {}) {
    const location = this.locator.location()
    const data = await this.storer.retrieve(location)
    const source = { '@': { [this.collection]: Object.values(data) } }
    return this.parser.parse(expression, { ...context, ...source })
  }

  load (items) {
    const location = this.locator.location()
    const entities = this.create(items)
    this.storer.load(location, entities)
    return entities
  }
}
