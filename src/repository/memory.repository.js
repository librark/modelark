import { DefaultLocator } from '../common'
import { Filterer } from '../filterer'
import { Repository } from './repository.js'

/**
 * @typedef { import("../common").Entity } Entity
 * @typedef { import("../common").Locator } Locator
 */

export class MemoryRepository extends Repository {
  constructor ({
    locator = new DefaultLocator(),
    filterer = new Filterer(),
    clock = Date
  } = {}) {
    super()
    this.locator = /** @type {Locator} */ (locator)
    this.clock = clock
    this.filterer = filterer
    this.data = /** @type {Object<string, object>} */ (new Proxy({}, {
      get: (target, name) => name in target
        ? target[name]
        : (target[name] = {})
    }))
  }

  /** @param {Entity | Array<Entity>} items @return {Array<Entity>} */
  async add (items) {
    items = Array.isArray(items) ? items : [items]

    for (const item of items) {
      item.updatedAt = Math.floor(this.clock.now() / 1000)
      item.updatedBy = this.locator.reference()
      item.createdAt = item.createdAt || item.updatedAt
      item.createdBy = item.createdBy || item.updatedBy
      this.data[this.locator.location()][item.id] = item
    }

    return items
  }

  /** @param {Entity | Array<Entity>} items @return {Array<Entity>} */
  async remove (items) {
    items = Array.isArray(items) ? items : [items]
    const store = this.data[this.locator.location()]
    const result = []
    for (const item of items) {
      result.push(store[item.id])
      delete store[item.id]
    }

    return result
  }

  /** @param { Array<Any> } domain
   *  @param {{ limit: number | null }} limit
    * @return {Array<Entity>} */
  async search (domain, { limit = null } = {}) {
    let items = []
    const filter = this.filterer.parse(domain)
    const store = this.data[this.locator.location()]
    for (const item of Object.values(store)) {
      if (filter(item)) {
        items.push(item)
      }
    }

    if (limit != null) {
      items = items.slice(0, limit)
    }

    return items
  }
}
