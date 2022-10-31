import { JsonStorer } from '../core/index.js'
import { MemoryRepository } from './memory.repository.js'

export class JsonRepository extends MemoryRepository {
  constructor ({
    model, locator, directory, collection, disk
  } = {}) {
    const storer = new JsonStorer({
      directory,
      collection: collection || model?.constructor.name,
      disk
    })

    super({ model, locator, storer })
  }
}
