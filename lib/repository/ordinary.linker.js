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

  async query (expression) {
    const tuples = Object.fromEntries(await Promise.all(this.repositories.map(
      repository => [repository.collection, repository.search()]).map(
      async ([collection, records]) => [collection, await records])))

    return this.parser.parse(expression, { '@': tuples })
  }
}
