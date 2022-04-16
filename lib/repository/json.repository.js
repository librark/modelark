import { JsonStorer } from '../common/index.js'
import { MemoryRepository } from './memory.repository.js'

/**
 * @typedef { import("../common").Entity } Entity
 * @typedef { import("../common").Locator } Locator
 */

export class JsonRepository extends MemoryRepository {
  constructor ({
    model, locator, directory, collection
  } = {}) {
    const storer = new JsonStorer({ directory, collection })

    super({ model, locator, storer })
  }
}
