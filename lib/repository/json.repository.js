import { JsonStorer } from '../core/index.js'
import { MemoryRepository } from './memory.repository.js'

export class JsonRepository extends MemoryRepository {
  constructor ({
    model, locator, parser, sorter, clock, constraints,
    directory, collection, fs, path
  } = {}) {
    const storer = new JsonStorer({
      directory,
      collection: collection || model?.name,
      fs,
      path
    })

    super({ model, locator, parser, storer, sorter, clock, constraints })
  }
}
