import { DefaultLocator, Filterer, MemoryStorer } from '../common'
import { Repository } from './repository.js'

/**
 * @typedef { import("../common").Entity } Entity
 * @typedef { import("../common").Locator } Locator
 */

export class MemoryRepository extends Repository {
  constructor ({
    locator = new DefaultLocator(),
    filterer = new Filterer(),
    storer = new MemoryStorer(),
    clock = Date
  } = {}) {
    super()
    this.locator = /** @type {Locator} */ (locator)
    this.clock = clock
    this.filterer = filterer
    this.storer = storer
    this.data = /** @type {Object<string, object>} */ (new Proxy({}, {
      get: (target, name) => name in target
        ? target[name]
        : (target[name] = {})
    }))
  }

  /** @param {Entity | Array<Entity>} items @return {Array<Entity>} */
  async add (items) {
    items = Array.isArray(items) ? items : [items]
    const location = this.locator.location()
    const data = await this.storer.retrieve(location)

    for (const item of items) {
      item.updatedAt = Math.floor(this.clock.now() / 1000)
      item.updatedBy = this.locator.reference()
      item.createdAt = item.createdAt || item.updatedAt
      item.createdBy = item.createdBy || item.updatedBy
      data[item.id] = item
    }

    await this.storer.store(location, data)

    return items
  }

  /** @param {Entity | Array<Entity>} items @return {Array<Entity>} */
  async remove (items) {
    items = Array.isArray(items) ? items : [items]
    const location = this.locator.location()
    const data = await this.storer.retrieve(location)

    const result = []
    for (const item of items) {
      result.push(data[item.id])
      delete data[item.id]
    }

    await this.storer.store(location, data)

    return result
  }

  /** @param { Array<Any> } domain
   *  @param {{
   *    limit: number | null, offset: number | null, order: string | null
   *  }}
   * @return {Array<Entity>} */
  async search (domain, { limit = null, offset = null, order = null } = {}) {
    let items = []
    const filter = this.filterer.parse(domain)
    const store = this.data[this.locator.location()]
    for (const item of Object.values(store)) {
      if (filter(item)) {
        items.push(item)
      }
    }

    if (offset != null) {
      items = items.slice(offset)
    }

    if (limit != null) {
      items = items.slice(0, limit)
    }

    if (order != null) {
      const parts = order.toLowerCase().split(',')
      const comparators = []
      for (const part of parts) {
        const [field, direction] = part.trim().split(' ')
        const sign = direction === 'desc' ? -1 : 1
        comparators.push({ field, sign })
      }
      items = items.sort((a, b) => comparators.reduce(
        (previous, current) => previous || String(
          a[current.field]).localeCompare(
          b[current.field], undefined, { numeric: true }) * current.sign, 0))
    }

    return items
  }
}
