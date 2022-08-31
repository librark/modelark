export class Portal {
  constructor ({ repositories = [] } = {}) {
    this.registry = new Map()
    for (const repository of repositories) {
      this.registry.set(repository.model.constructor.name, repository)
    }
  }

  get (name) {
    const repository = this.registry.get(name)
    if (!repository) {
      throw new Error(`A repository for '${name}' has not been provided.`)
    }
    return repository
  }

  put (repository) {
    this.registry.set(repository.model.name, repository)
  }
}
