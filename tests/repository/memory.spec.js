import { describe, expect, it, beforeEach } from '@jest/globals'
import { uuid, Entity, DefaultLocator } from '../../src/common'
import { MemoryRepository } from '../../src/repository'

describe('MemoryRepository', () => {
  let repository = null
  const mockTimestamp = 1640446104

  beforeEach(function () {
    const mockDate = { now: () => mockTimestamp * 1000 }
    repository = new MemoryRepository({ clock: mockDate })
  })

  it('is defined', function () {
    expect(repository).toBeTruthy()
  })

  it('is defined with default values', function () {
    const repository = new MemoryRepository()
    expect(repository.locator instanceof DefaultLocator).toBe(true)
    expect(repository.clock).toBe(Date)
  })

  it('adds an entity to its data store', async () => {
    const id = uuid()
    const items = [new Entity({ id: id, name: 'John Doe' })]
    const records = await repository.add(items)

    const [record] = records

    expect(Array.isArray(records)).toBe(true)
    expect(records.length).toBe(1)
    expect(record.id).toEqual(id)
    expect(record.createdAt).toBe(mockTimestamp)
    expect(record.updatedAt).toBe(mockTimestamp)
    expect(repository.data.default[id]).toBe(record)
  })

  it('removes an entity from its data store', async () => {
    const id = uuid()
    const item = new Entity({ id: id, name: 'John Doe' })

    repository.data.default[id] = item

    expect(Object.values(repository.data.default).length).toBe(1)

    const records = await repository.remove(item)

    expect(records.length).toBe(1)
    expect(records[0].id).toBe(id)
    expect(Object.values(repository.data.default).length).toBe(0)
  })
})
