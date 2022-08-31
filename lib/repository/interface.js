export class RepositoryInterface {
  /** @return {Entity} */
  get model () {
    if (!this._model) {
      throw new Error('Not implemented')
    }
    return this._model
  }

  /** @return {string} */
  get collection () {
    return this._collection || `${this.model.constructor.name.toLowerCase()}s`
  }

  /** @param {Entity | Array<Entity>} items @return {Array<Entity>} */
  async add (item) {
    console.assert(item)
    throw new Error('Not implemented')
  }

  /** @param {Entity | Array<Entity>} items @return {Array<Entity>} */
  async remove (item) {
    console.assert(item)
    throw new Error('Not implemented')
  }

  /** @param { Array<Any> } domain
   *  @param {{
   *    limit: number | null, offset: number | null, order: string | null
   *  }}
   * @return {Array<Entity>} */
  async search (domain, { limit = null, offset = null } = {}) {
    console.assert([domain, limit, offset])
    throw new Error('Not implemented')
  }
}
