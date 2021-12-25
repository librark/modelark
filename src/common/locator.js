export class Locator {
  /** @returns {string} */
  reference () {
    throw new Error('Not implemented')
  }

  /** @returns {string} */
  location () {
    throw new Error('Not implemented')
  }
}

export class DefaultLocator {
  constructor ({ reference = 'default', location = 'default' } = {}) {
    this._reference = reference
    this._location = location
  }

  /** @returns {string} */
  reference () {
    return this._reference
  }

  /** @returns {string} */
  location () {
    return this._location
  }
}
