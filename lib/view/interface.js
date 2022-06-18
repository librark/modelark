export class ViewInterface {
  /** @param {object} parameters @return {Array<object>} */
  async query (parameters) {
    throw new Error('Not implemented')
  }
}
