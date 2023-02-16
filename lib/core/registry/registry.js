export class Registry {
  constructor ({ resources = {}, check = true } = {}) {
    this.registry = new Map()
    this.map(resources)
    this.check = check
  }

  get (name) {
    if (name?.constructor !== String) {
      name = name.name || name.constructor.name
    }
    const resource = this.registry.get(String(name))
    this.check && this._check(resource, name)
    return resource
  }

  set (resource, key = null) {
    const resources = [resource].flat()
    for (const resource of resources) {
      this.registry.set(key || this._index(resource), resource)
    }
  }

  map (mapping) {
    mapping = Array.isArray(mapping)
      ? Object.fromEntries(mapping.map(
        item => [this._index(item), item]))
      : mapping
    for (const [key, resource] of Object.entries(mapping)) {
      this.registry.set(key, resource)
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
