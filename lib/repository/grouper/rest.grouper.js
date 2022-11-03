import { RestRepository } from '../rest.repository.js'
import { Grouper } from './grouper.js'

export class RestGrouper extends Grouper {
  constructor ({ repository }) {
    super()
    this.set(repository)
    this.operations = [
      'count', 'max', 'min', 'sum', 'avg'
    ]
  }

  set (repository) {
    if (!(repository instanceof RestRepository)) {
      throw Error(`RestGrouper requires a RestRepository. Got ${repository}.`)
    }
    this.repository = repository
    return this
  }

  async group ({ domain = [], groups = [], aggregations = [] } = {}) {
  }

  _endpoint () {

  }

  _structure (result) {

  }
}
