import { JsonStorer } from '../common/index.js'
import { MemoryRepository } from './memory.repository.js'

export class JsonRepository extends MemoryRepository {
  constructor ({
    model, locator, directory, collection
  } = {}) {
    const storer = new JsonStorer({
      directory: directory,
      collection: collection || model?.constructor.name
    })

    super({ model, locator, storer })
  }
}
