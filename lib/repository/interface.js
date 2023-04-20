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

  /** @param {Array<Any>} condition
   *  @param {{
   *    limit: number | null, offset: number | null, order: string | null
   *  }}
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async search (condition = [], {
    limit = null, offset = null, order = null
  } = {}) {
    console.assert([condition, limit, offset, order])
    throw new Error('Not implemented.')
  }
}
