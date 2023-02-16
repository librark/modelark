import { Registry } from '../core/index.js'

export class Portal extends Registry {
  constructor ({ repositories = [], check = true } = {}) {
    super({ resources: repositories, check })
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
