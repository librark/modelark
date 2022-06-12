import { describe, expect, it, beforeEach } from '@jest/globals'
import { Aggregator } from '../../../lib/common/aggregator/index.js'

function dataset () {
  return [
    { name: 'Mazda 3', type: 'sedan', year: '2018', price: 21000 },
    { name: 'Corolla', type: 'sedan', year: '2019', price: 25000 },
    { name: 'Tesla M3', type: 'sedan', year: '2020', price: 51000 },
    { name: 'GMC', type: 'truck', year: '2019', price: 60000 },
    { name: 'Mercedes', type: 'sedan', year: '2020', price: 70000 },
    { name: 'Wolkswagen', type: 'van', year: '2020', price: 30000 },
    { name: 'BMW', type: 'sedan', year: '2019', price: 65000 },
    { name: 'Ford F150', type: 'truck', year: '2019', price: 70000 },
    { name: 'Chrysler', type: 'van', year: '2018', price: 45000 },
    { name: 'Kia', type: 'suv', year: '2020', price: 47000 },
    { name: 'Jeep', type: 'truck', year: '2020', price: 43000 },
    { name: 'Audi Q8', type: 'suv', year: '2019', price: 67000 }
  ]
}

describe('Aggregator', () => {
  let aggregator = null

  beforeEach(() => {
    aggregator = new Aggregator()
  })

  it('can be instantiated', () => {
    expect(aggregator).toBeTruthy()
  })

  it('groups a dataset by the given group', () => {
    const result = aggregator.aggregate(dataset())

    expect(result).toEqual([
      { count: 12 }
    ])
  })

  it('groups a dataset by the given group', () => {
    const groups = ['type']

    const result = aggregator.aggregate(dataset(), groups)

    expect(result).toEqual([
      { type: 'sedan', count: 5 },
      { type: 'suv', count: 2 },
      { type: 'truck', count: 3 },
      { type: 'van', count: 2 }
    ])
  })

  it('groups by other keys', () => {
    const groups = ['year']

    const result = aggregator.aggregate(dataset(), groups)

    expect(result).toEqual([
      { year: '2018', count: 2 },
      { year: '2019', count: 5 },
      { year: '2020', count: 5 }
    ])
  })

  it('groups by multiple keys', () => {
    const groups = ['year', 'type']

    const result = aggregator.aggregate(dataset(), groups)

    expect(result).toEqual([
      { year: '2018', type: 'sedan', count: 1 },
      { year: '2018', type: 'van', count: 1 },
      { year: '2019', type: 'sedan', count: 2 },
      { year: '2019', type: 'suv', count: 1 },
      { year: '2019', type: 'truck', count: 2 },
      { year: '2020', type: 'sedan', count: 2 },
      { year: '2020', type: 'suv', count: 1 },
      { year: '2020', type: 'truck', count: 1 },
      { year: '2020', type: 'van', count: 1 }
    ])
  })

  it('groups by multiple keys inverted', () => {
    const groups = ['type', 'year']

    const result = aggregator.aggregate(dataset(), groups)

    expect(result).toEqual([
      { type: 'sedan', year: '2018', count: 1 },
      { type: 'sedan', year: '2019', count: 2 },
      { type: 'sedan', year: '2020', count: 2 },
      { type: 'suv', year: '2019', count: 1 },
      { type: 'suv', year: '2020', count: 1 },
      { type: 'truck', year: '2019', count: 2 },
      { type: 'truck', year: '2020', count: 1 },
      { type: 'van', year: '2018', count: 1 },
      { type: 'van', year: '2020', count: 1 }
    ])
  })

  it('applies single aggregation operations', () => {
    const groups = ['year']
    const aggregations = ['sum:price']

    const result = aggregator.aggregate(
      dataset(), groups, aggregations)

    expect(result).toEqual([
      { year: '2018', sumPrice: 66000 },
      { year: '2019', sumPrice: 287000 },
      { year: '2020', sumPrice: 241000 }
    ])
  })

  it('applies multiple aggregation operations', () => {
    const groups = ['type', 'year']
    const aggregations = ['sum:price', 'count:name']

    const result = aggregator.aggregate(
      dataset(), groups, aggregations)

    expect(result).toEqual([
      { type: 'sedan', year: '2018', sumPrice: 21000, countName: 1 },
      { type: 'sedan', year: '2019', sumPrice: 90000, countName: 2 },
      { type: 'sedan', year: '2020', sumPrice: 121000, countName: 2 },
      { type: 'suv', year: '2019', sumPrice: 67000, countName: 1 },
      { type: 'suv', year: '2020', sumPrice: 47000, countName: 1 },
      { type: 'truck', year: '2019', sumPrice: 130000, countName: 2 },
      { type: 'truck', year: '2020', sumPrice: 43000, countName: 1 },
      { type: 'van', year: '2018', sumPrice: 45000, countName: 1 },
      { type: 'van', year: '2020', sumPrice: 30000, countName: 1 }
    ])
  })

  it('supports multiple aggregation methods', () => {
    expect(aggregator.aggregate(dataset(), [], ['sum:price'])).toEqual(
      [{ sumPrice: 594000 }])
    expect(aggregator.aggregate(dataset(), [], ['max:price'])).toEqual(
      [{ maxPrice: 70000 }])
    expect(aggregator.aggregate(dataset(), [], ['min:price'])).toEqual(
      [{ minPrice: 21000 }])
    expect(aggregator.aggregate(dataset(), [], ['avg:price'])).toEqual(
      [{ avgPrice: 49500 }])
  })
})
