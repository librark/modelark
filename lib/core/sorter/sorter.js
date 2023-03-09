export class Sorter {
  sort (dataset, order) {
    const parts = order.toLowerCase().split(',')
    const comparators = []
    for (const part of parts) {
      const [field, direction] = part.trim().split(' ')
      const sign = direction === 'desc' ? -1 : 1
      comparators.push({ field, sign })
    }
    return dataset.sort((a, b) => comparators.reduce(
      (previous, current) => previous || String(
        a[current.field]).localeCompare(
        b[current.field], undefined, { numeric: true }) * current.sign, 0))
  }
}
