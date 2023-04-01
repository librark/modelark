export class Sorter {
  sort (dataset, order = null) {
    if (!order) return dataset
    const parts = order.split(',')
    const comparators = []
    for (const part of parts) {
      const [field, direction] = part.trim().split(' ')
      const sign = direction?.toLowerCase() === 'desc' ? -1 : 1
      comparators.push({ field, sign })
    }
    return dataset.sort((a, b) => comparators.reduce(
      (previous, current) => {
        return previous || JSON.stringify(a[current.field]).localeCompare(
          JSON.stringify(b[current.field]), undefined, { numeric: true }) *
          current.sign
      }, 0))
  }
}
