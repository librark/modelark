export class RepositoryInterface {
  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async add (item) {
    console.assert(item)
    throw new Error('Not implemented.')
  }

  /** @param {Entity | Array<Entity>} items
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async remove (item) {
    console.assert(item)
    throw new Error('Not implemented.')
  }

  /** @param {Array<Any>} domain
   *  @param {{
   *    limit: number | null, offset: number | null, order: string | null
   *  }}
   * @return {Promise<Entity> | Promise<Array<Entity>>} */
  async search (domain = [], {
    limit = null, offset = null, order = null
  } = {}) {
    console.assert([domain, limit, offset, order])
    throw new Error('Not implemented.')
  }
}
