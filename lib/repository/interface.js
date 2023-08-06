export class RepositoryInterface {
  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async add (items) {
    console.assert(items)
    throw new Error('Not implemented.')
  }

  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async remove (items) {
    console.assert(items)
    throw new Error('Not implemented.')
  }

  /** @param {Array<Any>} expression
   * @param {object?} context
   * @return {Promise<Array<object>>} */
  async query (expression, context = {}) {
    console.assert([expression, context])
    throw new Error('Not implemented.')
  }
}
