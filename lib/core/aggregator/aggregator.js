export class Aggregator {
  constructor () {
    this.operations = {
      count: (_, values) => values.length,
      max: (field, values) => Math.max(...values.map(item => item[field])),
      min: (field, values) => Math.min(...values.map(item => item[field])),
      sum: (field, values) => values.reduce(
        (result, item) => result + item[field], 0),
      avg: (field, values) => values.reduce(
        (result, item) => result + item[field], 0) / values.length
    }
  }

  aggregate (dataset, groups = [], aggregations = []) {
    const categorizer = (value) => groups.map(
      group => value[group]).join(',')
    const grouped = (groups.length
      ? dataset.reduce((result, value) => (
        (result[categorizer(value)] || (
          result[categorizer(value)] = [])).push(value) && result), {})
      : { '': dataset })

    aggregations = aggregations.length ? aggregations : ['count:']

    const result = []
    for (const [key, values] of Object.entries(grouped).sort()) {
      const record = Object.fromEntries(key.split(',').filter(Boolean).map(
        (item, index) => [groups[index], item]))

      for (const aggregation of aggregations) {
        const [method, field] = aggregation.split(':')
        const suffix = field.charAt(0).toUpperCase() + field.slice(1)
        record[`${method}${suffix}`] = this.operations[method](field, values)
      }
      result.push(record)
    }

    return result
  }
}
