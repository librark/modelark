export class Persister {
  constructor ({ repositories }) {
    this.registry = new Map()
    for (const repository of repositories) {
      this.registry.set(repository.model, repository)
    }
  }

  get (model) {
    return this.registry.get(model)
  }

  put (repository) {
    this.registry.set(repository.model, repository)
  }
}
