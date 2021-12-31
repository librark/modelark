export class Storer {
  /** @param {string} key @returns {Object}  */
  async retrieve (key) {
    console.assert([key])
    throw new Error('Not implemented')
  }

  /** @param {string} key @param {Object} value  */
  async store (key, value) {
    console.assert([key, value])
    throw new Error('Not implemented')
  }
}

export class MemoryStorer extends Storer {
  constructor () {
    super()
    this.data = /** @type {Object<string, object>} */ (new Proxy({}, {
      get: (target, name) => name in target
        ? target[name]
        : (target[name] = {})
    }))
  }

  /** @param {string} key @returns {Object}  */
  async retrieve (key) {
    return this.data[key]
  }

  /** @param {string} key @param {Object} value  */
  async store (key, value) {
    this.data[key] = value
  }
}
