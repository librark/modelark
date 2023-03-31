import {
  Entity, DefaultLocator, Filterer, MemoryStorer, Sorter
} from '../core/index.js'
import { Repository } from './repository.js'

export class MemoryRepository extends Repository {
  constructor ({
    model = new Entity(),
    locator = new DefaultLocator(),
    filterer = new Filterer(),
    storer = new MemoryStorer(),
    sorter = new Sorter(),
    clock = null
  } = {}) {
    super()
    this._model = model
    this.locator = /** @type {Locator} */ (locator)
    this.clock = clock || (() => new Date())
    this.filterer = filterer
    this.storer = storer
    this.sorter = sorter
  }

  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async add (items) {
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
  async remove (items) {
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

  /** @param {Array<Any>} condition
   *  @param {{
   *    limit: number | null, offset: number | null, order: string | null
   *  }}
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async search (condition = [], {
    limit = null, offset = null, order = null
  } = {}) {
    const filter = this.filterer.parse(condition)
    const location = this.locator.location()
    const data = await this.storer.retrieve(location)

    let items = Object.values(data).filter(item => filter(item))

    items = items.slice(offset ?? 0, limit ?? Infinity)

    items = this.sorter.sort(items, order)

    const Constructor = this.model.constructor

    return items.map(item => new Constructor(item))
  }

  load (items) {
    console.log('LOADING:::::')
    const location = this.locator.location()
    const data = this.create(items)
    this.storer.load(location, data)
  }
}
