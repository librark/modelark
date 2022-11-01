import { JsonStorer } from '../core/index.js'
import { MemoryRepository } from './memory.repository.js'

export class JsonRepository extends MemoryRepository {
  constructor ({
    model, locator, directory, collection, fs, path
  } = {}) {
    const storer = new JsonStorer({
      directory,
      collection: collection || model?.constructor.name,
      fs,
      path
    })

    super({ model, locator, storer })
  }
}
