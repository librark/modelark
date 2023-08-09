export class Storer {
  async retrieve (key) {
    console.assert([key])
    throw new Error('Not implemented')
  }

  async store (key, data) {
    console.assert([key, data])
    throw new Error('Not implemented')
  }

  load (key, data, field = 'id') {
    console.assert([key, data, field])
    throw new Error('Not implemented')
  }
}

export class MemoryStorer extends Storer {
  constructor ({ data = {}, field = 'id' } = {}) {
    super()
    if (Array.isArray(data)) {
      data = Object.fromEntries(data.map(item => [item[field], item]))
    }
    this.data = /** @type {Object<string, object>} */ (new Proxy({}, {
      get: (target, name) => name in target
        ? target[name]
        : (target[name] = data)
    }))
  }

  async retrieve (key) {
    return this.data[key]
  }

  async store (key, data) {
    this.data[key] = data
  }

  load (key, data, field = 'id') {
    if (Array.isArray(data)) {
      data = Object.fromEntries(data.map(item => [item[field], item]))
    }
    this.data[key] = data
  }
}
