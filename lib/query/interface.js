export class QueryInterface {
  async execute (parameters) {
    try {
      return await this.perform(parameters)
    } catch (error) {
      throw new Error(`Execution failed: ${error.message}`)
    }
  }

  async perform (_parameters) {
    throw new Error('Not implemented. Must be described by subclasses.')
  }
}
