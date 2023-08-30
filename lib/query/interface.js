export class QueryInterface {
  /** @param {Object} parameters @return {Object} */
  async execute (parameters) {
    return await this.perform(parameters)
  }

  /** @param {Object} _parameters @return {Object} */
  async perform (_parameters) {
    throw new Error('Not implemented. Must be described by subclasses.')
  }
}
