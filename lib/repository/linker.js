export class Linker {
  /** @param {Array<Repository>} repositories @return @this */
  setup (respositories) {
    throw new Error('Not implemented.')
  }

  /**
   * @param {Array} expression
   * @param {object?} context
   * @return {Promise<object>} */
  async query (expression, context = null) {
    throw new Error('Not implemented.')
  }
}
