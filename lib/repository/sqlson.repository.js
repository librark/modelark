import { SqlRepository } from './sql.repository.js'

export class SqlsonRepository extends SqlRepository {
  constructor ({
    model, collection, locator, connector, filterer, clock
  } = {}) {
    super({ model, collection, locator, connector, filterer, clock })
  }

  _tabulize (items) {
    const entries = items.map(item => ({ id: item.id, data: item }))
    return super._tabulize(entries)
  }
}
