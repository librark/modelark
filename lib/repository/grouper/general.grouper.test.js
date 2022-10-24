import { describe, expect, it, beforeEach } from '@jest/globals'
import { MemoryRepository } from '../memory.repository.js'
import { GeneralGrouper } from './general.grouper.js'
import { Entity } from '../../core/index.js'

class Metric extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.name = attributes.name || ''
    this.category = attributes.category || ''
    this.year = attributes.year || ''
    this.value = attributes.value || 0
  }
}

describe('GeneralGrouper', () => {
  let grouper = null

  const mockTimestamp = new Date(1666628425 * 1000)

  beforeEach(async () => {
    const mockDate = () => mockTimestamp
    const model = new Metric()
    const repository = new MemoryRepository({ model, clock: mockDate })
    await repository.add(repository.create([
      { name: 'Event001', category: 'special', year: '2022', value: 51000 },
      { name: 'Event002', category: 'special', year: '2020', value: 23000 },
      { name: 'Event003', category: 'general', year: '2022', value: 13000 },
      { name: 'Event004', category: 'special', year: '2020', value: 55500 },
      { name: 'Event005', category: 'general', year: '2022', value: 67500 },
      { name: 'Event006', category: 'general', year: '2022', value: 34000 },
      { name: 'Event007', category: 'special', year: '2020', value: 23000 },
      { name: 'Event008', category: 'routine', year: '2022', value: 99500 },
      { name: 'Event009', category: 'special', year: '2020', value: 87250 },
      { name: 'Event010', category: 'routine', year: '2021', value: 23000 },
      { name: 'Event011', category: 'special', year: '2020', value: 45000 },
      { name: 'Event012', category: 'routine', year: '2021', value: 48500 }
    ]))

    grouper = new GeneralGrouper({ repository })
  })

  it('can be instantiated', () => {
    const grouper = new GeneralGrouper()
    expect(grouper).toBeTruthy()
  })

  it('count the data stored in the repository by default', async () => {
    const records = await grouper.group()

    expect(records).toEqual([
      { count: 12 }
    ])
  })

  it('can filter the repository records before aggregation', async () => {
    const domain = [['category', '=', 'special']]

    const records = await grouper.group({ domain })

    expect(records).toEqual([
      { count: 6 }
    ])
  })

  it('groups by multiple fields', async () => {
    const groups = ['category', 'year']

    const records = await grouper.group({ groups })

    expect(records).toEqual([
      { category: 'general', count: 3, year: '2022' },
      { category: 'routine', count: 2, year: '2021' },
      { category: 'routine', count: 1, year: '2022' },
      { category: 'special', count: 5, year: '2020' },
      { category: 'special', count: 1, year: '2022' }
    ])
  })

  it('applies multiple aggregations', async () => {
    const groups = ['category', 'year']
    const aggregations = ['sum:value', 'count:']

    const records = await grouper.group({ groups, aggregations })

    expect(records).toEqual([
      { category: 'general', count: 3, sumValue: 114500, year: '2022' },
      { category: 'routine', count: 2, sumValue: 71500, year: '2021' },
      { category: 'routine', count: 1, sumValue: 99500, year: '2022' },
      { category: 'special', count: 5, sumValue: 233750, year: '2020' },
      { category: 'special', count: 1, sumValue: 51000, year: '2022' }
    ])
  })
})
