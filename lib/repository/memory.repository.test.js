import { describe, expect, it, beforeEach } from '@jest/globals'
import {
  uuid, Entity, DataParser, DefaultLocator, MemoryStorer
} from '../../lib/core/index.js'
import { MemoryRepository } from './memory.repository.js'

class Alpha extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.name = attributes.name || ''
    this.category = attributes.category || ''
    this.value = attributes.value || 0
  }
}

describe('MemoryRepository', () => {
  let repository = null
  const mockTimestamp = new Date(1640446104 * 1000)

  beforeEach(function () {
    const mockDate = () => mockTimestamp
    const model = new Alpha()
    repository = new MemoryRepository({ model, clock: mockDate })
  })

  it('is defined', function () {
    expect(repository).toBeTruthy()
  })

  it('is defined with default values', function () {
    const repository = new MemoryRepository()
    expect(repository.model.constructor).toBe(Entity)
    expect(repository.locator instanceof DefaultLocator).toBe(true)
    expect(repository.parser instanceof DataParser).toBe(true)
    expect(repository.storer instanceof MemoryStorer).toBe(true)
    expect(repository.clock()).toBeTruthy()
  })

  it('adds an entity to its data store', async () => {
    const id = uuid()
    const item = new Alpha(
      { id, createdAt: mockTimestamp, name: 'John Doe' })

    const record = await repository.add(item)

    expect(record.id).toEqual(id)
    expect(record.createdAt).toEqual(mockTimestamp)
    expect(record.updatedAt).toEqual(mockTimestamp)
    expect(repository.storer.data.default[id]).toBe(record)
  })

  it('adds multiple entities to its data store', async () => {
    const id1 = uuid()
    const id2 = uuid()
    const items = [
      new Alpha({ id: id1, name: 'John Doe' }),
      new Alpha({ id: id2, nmae: 'Richard Roe' })
    ]
    const records = await repository.add(items)

    const [record1, record2] = records

    expect(Array.isArray(records)).toBe(true)
    expect(records.length).toBe(2)
    expect(repository.storer.data.default[id1]).toBe(record1)
    expect(repository.storer.data.default[id2]).toBe(record2)
  })

  it('replaces entities in the data store', async () => {
    const id1 = uuid()
    const items = [
      new Alpha({ id: id1, name: 'John Doe' })
    ]
    await new Promise(resolve => setTimeout(resolve, 100))
    repository.clock = () => new Date()
    expect(items[0].createdAt).toEqual(items[0].updatedAt)
    let records = await repository.add(items)
    const [record1] = records
    expect(Array.isArray(records)).toBe(true)
    expect(records.length).toBe(1)
    expect(record1.createdAt).not.toEqual(record1.updatedAt)
    record1.name = 'Johnathan Doe'

    records = await repository.add([record1])

    const [updatedRecord] = records
    expect(records.length).toBe(1)
    expect(updatedRecord.name).not.toEqual('John Doe')
    expect(updatedRecord.updatedAt).not.toEqual(updatedRecord.createdAt)
  })

  it('sets the update time as create time if not truthy', async () => {
    const item = new Alpha({ id: uuid(), name: 'John Doe' })
    item.createdAt = 0

    const records = await repository.add([item])

    const [record] = records

    expect(records.length).toBe(1)
    expect(record.createdAt).toEqual(record.updatedAt)
  })

  it('removes an entity from its data store', async () => {
    const id = uuid()
    const item = new Alpha({ id, name: 'John Doe' })
    repository.storer.data.default[id] = item
    expect(Object.values(repository.storer.data.default).length).toBe(1)

    const record = await repository.remove(item)

    expect(record.id).toBe(id)
    expect(Object.values(repository.storer.data.default).length).toBe(0)
  })

  it('removes multiple entities from its data store', async () => {
    const id1 = uuid()
    const id2 = uuid()
    const item1 = new Alpha({ id: id1, name: 'John Doe' })
    const item2 = new Alpha({ id: id2, name: 'Richard Roe' })

    repository.storer.data.default[id1] = item1
    repository.storer.data.default[id2] = item2

    const items = [item1, item2]

    expect(Object.values(repository.storer.data.default).length).toBe(2)

    const records = await repository.remove(items)

    expect(records.length).toBe(2)
    expect(records[0].id).toBe(id1)
    expect(records[1].id).toBe(id2)
    expect(Object.values(repository.storer.data.default).length).toBe(0)
  })

  it('returns null when deleting unexisiting entities', async () => {
    const item = new Alpha({ id: 'C009', name: 'John Doe' })
    const record = await repository.remove(item)

    expect(record).toBeNull()
  })

  it('returns null when deleting existing and unexisiting entities', async () => {
    const item1 = new Alpha({ id: 'C001', name: 'John Doe' })
    const item2 = new Alpha({ id: 'C009', name: 'John Doe' })
    await repository.add(item1)

    const records = await repository.remove([item1, item2])

    expect(records[0].id).toEqual('C001')
    expect(records[1]).toBeNull()
  })

  it('queries its own records based on a symbolic expression', async () => {
    repository.load([
      { id: 'I001', name: 'Rock', category: 'EARTH', value: 5 },
      { id: 'I002', name: 'Ocean', category: 'WATER', value: 15 },
      { id: 'I003', name: 'Huricane', category: 'WIND', value: 5 },
      { id: 'I004', name: 'Flame', category: 'FIRE', value: 5 },
      { id: 'I005', name: 'Mountain', category: 'EARTH', value: 5 },
      { id: 'I006', name: 'Explosion', category: 'FIRE', value: 10 },
      { id: 'I007', name: 'Tornado', category: 'WIND', value: 5 },
      { id: 'I008', name: 'Lake', category: 'WATER', value: 5 },
      { id: 'I009', name: 'Volcano', category: 'FIRE', value: 5 }
    ])

    const expression = [
      '$select', [':category', ['$sum', ':value']],
      ['$group', [':category'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const result = await repository.query(expression)

    expect(result).toBeTruthy()
    expect(result).toEqual([
      { category: 'EARTH', sum: 10 },
      { category: 'WATER', sum: 20 },
      { category: 'WIND', sum: 10 },
      { category: 'FIRE', sum: 20 }
    ])
  })

  it('searches for entities given a query condition', async () => {
    const id1 = uuid()
    const id2 = uuid()
    const item1 = new Alpha({ id: id1, name: 'John Doe' })
    const item2 = new Alpha({ id: id2, name: 'Richard Roe' })
    repository.storer.data.default[id1] = item1
    repository.storer.data.default[id2] = item2

    const condition = ['=', ':name', 'John Doe']
    const result = await repository.search(condition)

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(1)
    expect(result[0].id).toBe(id1)
  })

  it('searches all entities by default', async () => {
    const item1 = new Alpha({ id: uuid(), name: 'John Doe' })
    const item2 = new Alpha({ id: uuid(), name: 'Richard Roe' })
    const item3 = new Alpha({ id: uuid(), name: 'Mark Moe' })
    repository.storer.data.default[item1.id] = item1
    repository.storer.data.default[item2.id] = item2
    repository.storer.data.default[item3.id] = item3

    const result = await repository.search()

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(3)
    expect(result[0].id).toBe(item1.id)
    expect(result[1].id).toBe(item2.id)
    expect(result[2].id).toBe(item3.id)
  })

  it('searches for entities and limits the results', async () => {
    const item1 = new Alpha({ id: uuid(), name: 'John Doe' })
    const item2 = new Alpha({ id: uuid(), name: 'Richard Roe' })
    const item3 = new Alpha({ id: uuid(), name: 'Mark Moe' })
    repository.storer.data.default[item1.id] = item1
    repository.storer.data.default[item2.id] = item2
    repository.storer.data.default[item3.id] = item3

    const result = await repository.search([], { limit: 2 })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
    expect(result[0].id).toBe(item1.id)
    expect(result[1].id).toBe(item2.id)
  })

  it('searches for entities and offsets the results', async () => {
    const item1 = new Alpha({ id: uuid(), name: 'John Doe' })
    const item2 = new Alpha({ id: uuid(), name: 'Richard Roe' })
    const item3 = new Alpha({ id: uuid(), name: 'Mark Moe' })
    repository.storer.data.default[item1.id] = item1
    repository.storer.data.default[item2.id] = item2
    repository.storer.data.default[item3.id] = item3

    const result = await repository.search([], { offset: 2, limit: 1 })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(1)
    expect(result[0].id).toBe(item3.id)
  })

  it('searches for entities and sorts the results', async () => {
    const item1 = new Alpha({ id: uuid(), name: 'John Doe' })
    const item2 = new Alpha({ id: uuid(), name: 'Richard Roe' })
    const item3 = new Alpha({ id: uuid(), name: 'Mark Moe' })
    repository.storer.data.default[item1.id] = item1
    repository.storer.data.default[item2.id] = item2
    repository.storer.data.default[item3.id] = item3

    const result = await repository.search([], { order: 'name' })

    expect(result[0].name).toBe('John Doe')
    expect(result[1].name).toBe('Mark Moe')
    expect(result[2].name).toBe('Richard Roe')
  })

  it('searches and sorts the results in descending order', async () => {
    const item1 = new Alpha({ id: uuid(), name: 'John Doe', value: 10 })
    const item2 = new Alpha({ id: uuid(), name: 'Richard Roe', value: 9 })
    const item3 = new Alpha({ id: uuid(), name: 'Mark Moe', value: 9 })
    const item4 = new Alpha({ id: uuid(), name: 'Larry Loe', value: 0 })
    const item5 = new Alpha({ id: uuid(), name: 'Peter Poe', value: 0 })
    repository.storer.data.default[item1.id] = item1
    repository.storer.data.default[item2.id] = item2
    repository.storer.data.default[item3.id] = item3
    repository.storer.data.default[item4.id] = item4
    repository.storer.data.default[item5.id] = item5

    const result = await repository.search([], { order: 'value, name desc' })

    expect(result[0].name).toBe('Peter Poe')
    expect(result[1].name).toBe('Larry Loe')
    expect(result[2].name).toBe('Richard Roe')
    expect(result[3].name).toBe('Mark Moe')
    expect(result[4].name).toBe('John Doe')
  })

  it('loads multiple objects to its data store synchronously', () => {
    const id1 = uuid()
    const id2 = uuid()
    const items = [
      { id: id1, name: 'John Doe' },
      { id: id2, name: 'Richard Roe' }
    ]

    const entities = repository.load(items)

    expect(entities.every(entity =>
      entity.constructor === repository.model.constructor)).toBeTruthy()
    expect(repository.storer.data.default[id1]).toBeInstanceOf(Alpha)
    expect(repository.storer.data.default[id1].name).toEqual('John Doe')
    expect(repository.storer.data.default[id2]).toBeInstanceOf(Alpha)
    expect(repository.storer.data.default[id2].name).toEqual('Richard Roe')
  })

  it.skip('allows insertion if constraints are not met', async () => {
    class Item extends Entity {
      constructor (attributes = {}) {
        super(attributes)
        this.name = attributes.name || ''
        this.category = attributes.category || ''
        this.value = attributes.value || 0
      }

      static constraints = [
        {
          message: 'Each category value "sum" must not reach 20',
          expression: [
            '$select', ['*'],
            ['$having', ['<', ['$sum', ':value'], 20],
              ['$group', [':category'],
                ['$from', ['$as', 'Item', '@Item']]]]
          ]
        }
      ]
    }
    const repository = new MemoryRepository({ model: new Item() })
    repository.load([
      { id: 'I001', name: 'Rock', category: 'EARTH', value: 5 },
      { id: 'I002', name: 'Ocean', category: 'WATER', value: 5 },
      { id: 'I003', name: 'Huricane', category: 'WIND', value: 5 },
      { id: 'I004', name: 'Flame', category: 'FIRE', value: 5 },
      { id: 'I005', name: 'Mountain', category: 'EARTH', value: 5 },
      { id: 'I006', name: 'Explosion', category: 'FIRE', value: 5 },
      { id: 'I007', name: 'Tornado', category: 'WIND', value: 5 },
      { id: 'I008', name: 'Lake', category: 'WATER', value: 5 },
      { id: 'I009', name: 'Volcano', category: 'FIRE', value: 5 }
    ])
    const items = repository.create([
      { id: 'I010', name: 'Lake', category: 'WATER', value: 5 }
    ])

    await repository.add(items)

    const item = await repository.find('I010')
    expect(item).toBeTruthy()
  })

  it.skip('raises an error if checks are not met', async () => {
    class Item extends Entity {
      constructor (attributes = {}) {
        super(attributes)
        this.name = attributes.name || ''
        this.category = attributes.category || ''
        this.value = attributes.value || 0
      }

      static constraints = [
        {
          message: 'Each category value "sum" must not reach 20',
          expression: [
            '$select', ['*'],
            ['$having', ['>=', ['$sum', ':value'], 20],
              ['$group', [':category'],
                ['$from', ['$as', 'Item', '@Item']]]]
          ]
        }
      ]
    }
    const repository = new MemoryRepository({ model: new Item() })
    repository.load([
      { id: 'I001', name: 'Rock', category: 'EARTH', value: 5 },
      { id: 'I002', name: 'Ocean', category: 'WATER', value: 5 },
      { id: 'I003', name: 'Huricane', category: 'WIND', value: 5 },
      { id: 'I004', name: 'Flame', category: 'FIRE', value: 5 },
      { id: 'I005', name: 'Mountain', category: 'EARTH', value: 5 },
      { id: 'I006', name: 'Explosion', category: 'FIRE', value: 5 },
      { id: 'I007', name: 'Tornado', category: 'WIND', value: 5 },
      { id: 'I008', name: 'Lake', category: 'WATER', value: 5 },
      { id: 'I009', name: 'Volcano', category: 'FIRE', value: 5 }
    ])
    const items = repository.create([
      { id: 'I010', name: 'Bomb', category: 'FIRE', value: 5 }
    ])

    await expect(repository.add(items)).rejects.toThrow(
      'The category "sum" must not reach 20')
  })
})
