export class Registry {
  constructor ({ resources = [] } = {}) {
    this.registry = new Map()
    this.set(resources)
  }

  get (name) {
    if (name?.constructor !== String) {
      name = name.name || name.constructor.name
    }
    const resource = this.registry.get(String(name))
    this._check(resource, name)
    return resource
  }

  set (resource) {
    const resources = [resource].flat()
    for (const resource of resources) {
      this.registry.set(this._index(resource), resource)
    }
  }

  _index (resource) {
    return resource.constructor.name
  }

  _check (resource, name) {
    if (!resource) {
      throw new Error(`Resource '${name}' was not found in the registry.`)
    }
  }
}
