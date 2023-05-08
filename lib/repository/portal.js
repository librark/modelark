import { Registry } from '../core/index.js'

export class Portal extends Registry {
  constructor ({ repositories = [], check = true } = {}) {
    super({ resources: repositories, check })
    // this.cosaQueNoSeComoSeLlama = cosaQueNoSeComoSeLlama
    // this.cosaQueNoSeComoSeLlama.setup(repositories)
  }

  async query (expression) {
    return this.cosaQueNoSeComoSeLlama(expression)
  }

  _index (resource) {
    return resource.model.constructor.name
  }

  _check (resource, name) {
    if (!resource) {
      throw new Error(`A repository for '${name}' has not been provided.`)
    }
  }
}
