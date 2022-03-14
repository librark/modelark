import { DefaultLocator, Filterer, JsonStorer } from '../common/index.js'
import { MemoryRepository } from './memory.repository.js'

/**
 * @typedef { import("../common").Entity } Entity
 * @typedef { import("../common").Locator } Locator
 */

export class JsonRepository extends MemoryRepository {
  constructor ({
    locator = new DefaultLocator(),
    filterer = new Filterer(),
    storer = new JsonStorer(),
    clock = Date
  } = {}) {
    super({ locator, filterer, storer, clock })
  }
}
