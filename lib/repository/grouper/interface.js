export class GrouperInterface {
  set (repository) {
    throw new Error('Not implemented.')
  }

  async group (domain = [], groups = [], aggregations = []) {
    throw new Error('Not implemented.')
  }
}
