import { describe, expect, it, beforeEach } from '@jest/globals'
import {
  uuid, Entity, Filterer, DefaultLocator, MemoryStorer
} from '../../lib/core/index.js'
import { MemoryRepository } from './memory.repository.js'

class Alpha extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.name = attributes.name || ''
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
    expect(repository.filterer instanceof Filterer).toBe(true)
    expect(repository.storer instanceof MemoryStorer).toBe(true)
    expect(repository.clock).toBeTruthy()
  })

  it('adds an entity to its data store', async () => {
    const id = uuid()
    const item = new Alpha(
      { id, createdAt: mockTimestamp, name: 'John Doe' })
    const records = await repository.add(item)

    const [record] = records

    expect(Array.isArray(records)).toBe(true)
    expect(records.length).toBe(1)
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

    const records = await repository.add(item)

    const [record] = records

    expect(records.length).toBe(1)
    expect(record.createdAt).toEqual(record.updatedAt)
  })

  it('removes an entity from its data store', async () => {
    const id = uuid()
    const item = new Alpha({ id, name: 'John Doe' })

    repository.storer.data.default[id] = item

    expect(Object.values(repository.storer.data.default).length).toBe(1)

    const records = await repository.remove(item)

    expect(records.length).toBe(1)
    expect(records[0].id).toBe(id)
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

  it('searches for entities given a domain query', async () => {
    const id1 = uuid()
    const id2 = uuid()
    const item1 = new Alpha({ id: id1, name: 'John Doe' })
    const item2 = new Alpha({ id: id2, name: 'Richard Roe' })
    repository.storer.data.default[id1] = item1
    repository.storer.data.default[id2] = item2

    const domain = [['name', '=', 'John Doe']]
    const result = await repository.search(domain)

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(1)
    expect(result[0].id).toBe(id1)
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

    const result = await repository.search([], { offset: 2 })

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
})
