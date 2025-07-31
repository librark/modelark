import { DataParser } from '../core/index.js'
import { Linker } from './linker.js'

export class OrdinaryLinker extends Linker {
  constructor () {
    super()
    this.parser = new DataParser()
  }

  setup (respositories) {
    this.repositories = respositories
    return this
  }

  async query (expression, context) {
    const tuples = Object.fromEntries(await Promise.all(this.repositories.map(
      repository => [repository.collection, repository.search()]).map(
      async ([collection, records]) => [collection, await records])))

    const { mode = 'object', ...rest } = context ?? {}
    const result = await this.parser.parse(expression, { ...rest, '@': tuples })
    const sample = result.at(0)

    let fields = []
    if (sample) fields = Object.keys(sample)

    let rows = result
    if (mode === 'array') rows = result.map(item => Object.values(item))

    return { fields, rows }
  }
}
