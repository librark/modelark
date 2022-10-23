import { describe, expect, it, beforeEach } from '@jest/globals'
import { Entity } from '../../lib/core/entity/index.js'
import { Repository } from './repository.js'

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

  it('creates a new empty instance', async () => {
    const model = new ConcreteEntity()
    const repository = new ConcreteRepository({ model })

    const instance = repository.create()

    expect(instance instanceof ConcreteEntity).toBeTruthy()
  })

  it('creates a new model instance given its attributes', async () => {
    const model = new ConcreteEntity()
    const repository = new ConcreteRepository({ model })

    const instance = repository.create({ id: 'C001', name: 'New' })

    expect(instance instanceof ConcreteEntity).toBeTruthy()
    expect(instance.name).toEqual('New')
  })

  it('creates new model instances given their attributes', async () => {
    const model = new ConcreteEntity()
    const repository = new ConcreteRepository({ model })

    const instances = repository.create([
      { id: 'C001', name: 'First' },
      { id: 'C001', name: 'Second' }
    ])

    expect(instances[0].name).toEqual('First')
    expect(instances[1].name).toEqual('Second')
  })

  it('finds an entity based on an id', async () => {
    const model = new ConcreteEntity()
    const searchResult = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository({ model, searchResult })

    const found = await concreteRepository.find('C002')

    expect(found.id).toEqual('C002')
  })

  it('finds entities based on a list of strings', async () => {
    const model = new ConcreteEntity()
    const searchResult = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository({ model, searchResult })
    const records = ['C002', 'C003']

    const found = await concreteRepository.find(records)

    expect(found).toEqual(searchResult.slice(1))
    expect(concreteRepository._searchArguments).toEqual([
      [['id', 'in', ['C002', 'C003']]], { limit: null, offset: null }
    ])
  })

  it('finds entities based on a list of objects', async () => {
    const model = new ConcreteEntity()
    const searchResult = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository({ model, searchResult })
    const records = [{ id: 'C002' }, { id: 'C003' }]

    const found = await concreteRepository.find(records)

    expect(found).toEqual(searchResult.slice(1))
    expect(concreteRepository._searchArguments).toEqual([
      [['id', 'in', ['C002', 'C003']]], { limit: null, offset: null }
    ])
  })

  it('finds entities based on a string', async () => {
    const model = new ConcreteEntity()
    const searchResult = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository({ model, searchResult })
    const records = 'C003'

    const found = await concreteRepository.find(records)

    expect(found).toEqual(searchResult[2])
    expect(concreteRepository._searchArguments).toEqual([
      [['id', 'in', ['C003']]], { limit: null, offset: null }
    ])
  })

  it('returns null if entities not found', async () => {
    const model = new ConcreteEntity()
    const searchResult = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository({ model, searchResult })
    const records = ['C002', 'C003', 'C004']

    const found = await concreteRepository.find(records)

    expect(found).toEqual([searchResult[1], searchResult[2], null])
    expect(concreteRepository._searchArguments).toEqual([
      [['id', 'in', ['C002', 'C003', 'C004']]], { limit: null, offset: null }
    ])
  })

  it('can initialize entities if not found', async () => {
    const model = new ConcreteEntity()
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
