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

  _expand (location) {
    const structure = Object.entries(this.model).map(
      pair => `"${pair[0]}" ${this._type(pair[1])}`).join(', ')

    const subquery = ('SELECT * FROM jsonb_to_record(' +
    `"${location}"."${this.collection}"."data") as\n` +
    `x(${structure})`)

    return `(${subquery})`
  }
}
