export class QueryInterface {
  async execute (parameters) {
    return this.perform(parameters)
  }

  async perform (_parameters) {
    throw new Error('Not implemented. Must be described by subclasses.')
  }
}
