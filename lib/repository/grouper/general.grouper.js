import { Aggregator } from '../../core/index.js'
import { Grouper } from './grouper.js'

export class GeneralGrouper extends Grouper {
  constructor ({
    repository = null,
    aggregator = new Aggregator()
  } = {}) {
    super()
    this.repository = repository
    this.aggregator = aggregator
  }

  set (repository) {
    this.repository = repository
    return this
  }

  async group ({ domain = [], groups = [], aggregations = [] } = {}) {
    const entities = await this.repository.search(domain)

    const dataset = entities.map(entity => ({ ...entity }))

    return this.aggregator.aggregate(dataset, groups, aggregations)
  }
}
