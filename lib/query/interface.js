export class QueryInterface {
  /** @param {Object} parameters @return {Object} */
  async execute (parameters) {
    try {
      return await this.perform(parameters)
    } catch (error) {
      throw new Error(`Execution failed: ${error.message}`)
    }
  }

  /** @param {Object} _parameters @return {Object} */
  async perform (_parameters) {
    throw new Error('Not implemented. Must be described by subclasses.')
  }
}
