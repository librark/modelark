import { describe, expect, it, beforeEach } from '@jest/globals'
import { Entity } from '../../lib/common/entity.js'
import { Repository } from '../../lib/repository'

class ConcreteEntity extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.name = attributes.name || ''
  }
}

class ConcreteRepository extends Repository {
  constructor (attributes = {}) {
    super()
    this._model = attributes.model
    this._collection = attributes.collection
    this._searchResult = attributes.searchResult
    this._searchArguments = []
  }

  async search (domain, { limit = null, offset = null } = {}) {
    this._searchArguments = [domain, { limit, offset }]
    return this._searchResult
  }
}

describe('Repository', () => {
  let repository = null

  beforeEach(function () {
    repository = new Repository()
  })

  it('is defined', function () {
    expect(repository).toBeTruthy()
  })

  it('defines a find method', () => {
    const method = repository.find
    expect(typeof method).toBe('function')
  })

  it('finds entities based on a list of strings', async () => {
    const searchResult = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository({ searchResult })
    const records = ['C002', 'C003']

    const found = await concreteRepository.find(records)

    expect(found).toEqual(searchResult.slice(1))
    expect(concreteRepository._searchArguments).toEqual([
      [['id', 'in', ['C002', 'C003']]], { limit: null, offset: null }
    ])
  })

  it('finds entities based on a list of objects', async () => {
    const searchResult = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository({ searchResult })
    const records = [{ id: 'C002' }, { id: 'C003' }]

    const found = await concreteRepository.find(records)

    expect(found).toEqual(searchResult.slice(1))
    expect(concreteRepository._searchArguments).toEqual([
      [['id', 'in', ['C002', 'C003']]], { limit: null, offset: null }
    ])
  })

  it('finds entities based on a string', async () => {
    const searchResult = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository({ searchResult })
    const records = 'C003'

    const found = await concreteRepository.find(records)

    expect(found).toEqual(searchResult.slice(2))
    expect(concreteRepository._searchArguments).toEqual([
      [['id', 'in', ['C003']]], { limit: null, offset: null }
    ])
  })

  it('returns null if entities not found', async () => {
    const searchResult = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository({ searchResult })
    const records = ['C002', 'C003', 'C004']

    const found = await concreteRepository.find(records)

    expect(found).toEqual([searchResult[1], searchResult[2], null])
    expect(concreteRepository._searchArguments).toEqual([
      [['id', 'in', ['C002', 'C003', 'C004']]], { limit: null, offset: null }
    ])
  })

  it('can initialize entities if not found', async () => {
    const model = ConcreteEntity
    const collection = 'concrete_entities'
    const searchResult = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository(
      { model, collection, searchResult })
    const records = [{ id: 'C002' }, { id: 'C003' }, { id: 'C004' }]

    const found = await concreteRepository.find(records, { init: true })

    expect(found[0].id).toEqual('C002')
    expect(found[1].id).toEqual('C003')
    expect(found[2].id).toEqual('C004')
    expect(concreteRepository.collection).toEqual('concrete_entities')
  })
})
