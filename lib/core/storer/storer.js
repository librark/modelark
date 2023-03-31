export class Storer {
  /** @param {string} key @returns {Object}  */
  async retrieve (key) {
    console.assert([key])
    throw new Error('Not implemented')
  }

  /** @param {string} key @param {Object} data  */
  async store (key, data) {
    console.assert([key, data])
    throw new Error('Not implemented')
  }

  /** @param {object|object[]} data @returns {void} */
  load (data) {
    console.assert([data])
    throw new Error('Not implemented')
  }
}

export class MemoryStorer extends Storer {
  constructor ({ data, field } = {}) {
    super()
    this.load({ data, field })
  }

  /** @param {string} key @returns {Object}  */
  async retrieve (key) {
    return this.data[key]
  }

  /** @param {string} key @param {Object} data  */
  async store (key, data) {
    this.data[key] = data
  }

  load ({ data = {}, field = 'id' }) {
    if (Array.isArray(data)) {
      data = Object.fromEntries(data.map(item => [item[field], item]))
    }
    this.data = /** @type {Object<string, object>} */ (new Proxy({}, {
      get: (target, name) => name in target
        ? target[name]
        : (target[name] = data)
    }))
  }
}
