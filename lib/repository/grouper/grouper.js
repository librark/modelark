export class Grouper {
  /** @param {Repository} repository @return @this */
  set (repository) {
    throw new Error('Not implemented.')
  }

  /** @return {Array<Object>} */
  async group ({ condition = [], groups = [], aggregations = [] } = {}) {
    throw new Error('Not implemented.')
  }
}
