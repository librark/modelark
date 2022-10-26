import { Aggregator } from '../../core/index.js'

export class GeneralGrouper {
  constructor ({
    repository = null,
    aggregator = new Aggregator()
  } = {}) {
    this.repository = repository
    this.aggregator = aggregator
  }

  set (repository) {
    this.repository = repository
  }

  async group ({ domain = [], groups = [], aggregations = [] } = {}) {
    const entities = await this.repository.search(domain)

    const dataset = entities.map(entity => ({ ...entity }))

    return this.aggregator.aggregate(dataset, groups, aggregations)
  }
}
