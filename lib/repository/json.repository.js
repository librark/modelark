import { DefaultLocator, JsonStorer } from '../common/index.js'
import { MemoryRepository } from './memory.repository.js'

/**
 * @typedef { import("../common").Entity } Entity
 * @typedef { import("../common").Locator } Locator
 */

export class JsonRepository extends MemoryRepository {
  constructor ({
    directory, collection, reference, location
  } = {}) {
    const locator = new DefaultLocator({ reference, location })
    const storer = new JsonStorer({ directory, collection })

    super({ locator, storer })
  }
}
