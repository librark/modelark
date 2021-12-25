
export class RepositoryInterface {
  /** @param {Entity | Array<Entity>} items  */
  async add (item) {
    throw new Error('Not implemented')
  }

  async remove (item) {
    throw new Error('Not implemented')
  }

  async count (domain) {
    throw new Error('Not implemented')
  }

  async search (domain) {
    throw new Error('Not implemented')
  }
}
