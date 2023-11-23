import { describe, expect, it, beforeEach } from '@jest/globals'
import { Entity } from '../../lib/core/entity/index.js'
import { Repository } from './repository.js'
import { MemoryRepository } from './memory.repository.js'

class ConcreteEntity extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.name = attributes.name || ''
    this.reference = attributes.reference || ''
    this.identification = attributes.identification || ''
  }
}

class ConcreteRepository extends MemoryRepository {}

describe('Repository', () => {
  let repository = null

  beforeEach(function () {
    repository = new Repository()
  })

  it('is defined', function () {
    expect(repository).toBeTruthy()
  })

  it('defines a "model" property', () => {
    expect(() => repository.model).toThrow(
      'The repository "Entity" model has not been set.')
  })

  it('defines a "collection" property', () => {
    expect(() => repository.collection).toThrow(
      'The repository "Entity" model has not been set.')
  })

  it('defines a "state" property', async () => {
    expect(repository.state).toBeNull()
    expect(repository._state).toBeUndefined()
  })

  it('defines a "rejections" property', () => {
    expect(() => repository.rejections).toThrow(
      'The repository "Entity" model has not been set.')
  })

  it('creates a clone of itself with the given "state"', () => {
    const model = ConcreteEntity
    const originalRepository = new ConcreteRepository({ model })

    const state = { meta: { action: 'deferred' } }
    const clonedRepository = originalRepository.with(state)

    expect(originalRepository).not.toBe(clonedRepository)
    expect(originalRepository.state).not.toBe(clonedRepository.state)
    expect(clonedRepository).toBeInstanceOf(ConcreteRepository)
    expect(clonedRepository).toBeInstanceOf(originalRepository.constructor)
    expect(clonedRepository.model).toBe(model)
    expect(clonedRepository.state).toBe(state)
    expect(clonedRepository.collection).toEqual('ConcreteEntity')
  })

  it('defines a find method', () => {
    const method = repository.find
    expect(typeof method).toBe('function')
  })

  it('defines the interface of an optional load method', () => {
    expect(() => repository.load([])).toThrow(
      'This optional method has not been implemented by subclass "Repository"'
    )
  })

  it('accepts classes and instances as its constructor model', async () => {
    const classModel = ConcreteEntity
    const classModelRepository = new ConcreteRepository({
      model: classModel
    })
    expect(classModelRepository.model).toBe(ConcreteEntity)

    const instanceModel = new ConcreteEntity()
    const instanceModelRepository = new ConcreteRepository({
      model: instanceModel
    })
    expect(instanceModelRepository.model).toBe(ConcreteEntity)
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

  it('searches entities given a conditional symbolic expression', async () => {
    const model = new ConcreteEntity()
    const repository = new ConcreteRepository({ model })
    repository.load([
      { id: 'C001', name: 'John Doe' },
      { id: 'C002', name: 'Richard Roe' }
    ])

    const condition = ['=', ':name', 'John Doe']
    const result = await repository.search(condition)

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('C001')
    expect(result[0].name).toBe('John Doe')
  })

  it('finds an entity based on an id', async () => {
    const model = new ConcreteEntity()
    const entities = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository({ model })
    await concreteRepository.add(entities)

    const found = await concreteRepository.find('C002')

    expect(found.id).toEqual('C002')
  })

  it('finds entities based on a list of strings', async () => {
    const model = new ConcreteEntity()
    const entities = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository({ model })
    await concreteRepository.add(entities)
    const records = ['C002', 'C003']

    const found = await concreteRepository.find(records)

    expect(found).toEqual(entities.slice(1))
  })

  it('finds entities based on a list of objects', async () => {
    const model = new ConcreteEntity()
    const entities = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository({ model })
    await concreteRepository.add(entities)
    const records = [{ id: 'C002' }, { id: 'C003' }]

    const found = await concreteRepository.find(records)

    expect(found).toEqual(entities.slice(1))
  })

  it('finds entities based on a string', async () => {
    const model = new ConcreteEntity()
    const entities = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository({ model })
    await concreteRepository.add(entities)
    const records = 'C003'

    const found = await concreteRepository.find(records)

    expect(found).toEqual(entities[2])
  })

  it('finds entities on a given field', async () => {
    const model = new ConcreteEntity()
    const entities = [
      new ConcreteEntity({ id: 'C001', name: 'Hugo' }),
      new ConcreteEntity({ id: 'C002', name: 'Paco' }),
      new ConcreteEntity({ id: 'C003', name: 'Luis' })
    ]
    const concreteRepository = new ConcreteRepository({ model })
    await concreteRepository.add(entities)
    const records = 'Luis'

    const found = await concreteRepository.find(records, { field: ':name' })

    expect(found).toEqual(entities[2])
  })

  it('returns null if entities not found', async () => {
    const model = new ConcreteEntity()
    const entities = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository({ model })
    await concreteRepository.add(entities)
    const records = ['C002', 'C003', 'C004']

    const found = await concreteRepository.find(records)

    expect(found).toEqual([entities[1], entities[2], null])
  })

  it('can initialize entities if not found', async () => {
    const model = new ConcreteEntity()
    const collection = 'concrete_entities'
    const entities = [
      new ConcreteEntity({ id: 'C001' }),
      new ConcreteEntity({ id: 'C002' }),
      new ConcreteEntity({ id: 'C003' })
    ]
    const concreteRepository = new ConcreteRepository(
      { model, collection })
    await concreteRepository.add(entities)
    const records = [{ id: 'C002' }, { id: 'C003' }, { id: 'C004' }]

    const found = await concreteRepository.find(records, { init: true })

    expect(found[0].id).toEqual('C002')
    expect(found[1].id).toEqual('C003')
    expect(found[2].id).toEqual('C004')
    expect(concreteRepository.collection).toEqual('ConcreteEntity')
  })

  it('returns an array per entry if "many" is used', async () => {
    const model = new ConcreteEntity()
    const entities = [
      new ConcreteEntity({ id: 'C001', reference: 'R001' }),
      new ConcreteEntity({ id: 'C002', reference: 'R001' }),
      new ConcreteEntity({ id: 'C003', reference: 'R002' }),
      new ConcreteEntity({ id: 'C004', reference: 'R002' }),
      new ConcreteEntity({ id: 'C005', reference: 'R001' })
    ]
    const concreteRepository = new ConcreteRepository({ model })
    await concreteRepository.add(entities)
    const records = ['R001', 'R002', 'R003']

    const found = await concreteRepository.find(
      records, { field: ':reference', many: true })

    expect(found).toEqual([
      [entities[0], entities[1], entities[4]],
      [entities[2], entities[3]],
      []
    ])
  })

  it('allows insertion if no items are rejected', async () => {
    class Alpha extends Entity {
      constructor (attributes = {}) {
        super(attributes)
        this.name = attributes.name || ''
        this.category = attributes.category || ''
        this.value = attributes.value || 0
      }

      static rejections = [
        {
          message: 'The name of each item must be unique.',
          expression: [
            '$select', [':*'],
            ['$where', ['$in', ':name', ['_map', 'name', '#items']],
              ['$from', ['$as', 'Alpha', '@Alpha']]]
          ]
        }
      ]
    }
    const repository = new ConcreteRepository({ model: new Alpha() })
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
      { id: 'I010', name: 'Peak', category: 'EARTH', value: 5 }
    ])

    await repository.add(items)

    const item = await repository.find('I010')
    expect(item).toBeTruthy()
  })

  it('throws an error on rejections met', async () => {
    class Alpha extends Entity {
      constructor (attributes = {}) {
        super(attributes)
        this.name = attributes.name || ''
        this.category = attributes.category || ''
        this.value = attributes.value || 0
      }

      static rejections = [
        {
          message: 'The name of each item must be unique.',
          expression: [
            '$select', [':*'],
            ['$where', ['$in', ':name', ['_map', 'name', '#items']],
              ['$from', ['$as', 'Alpha', '@Alpha']]]
          ]
        }
      ]
    }
    const repository = new ConcreteRepository({ model: new Alpha() })
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
      { id: 'I010', name: 'Lake', category: 'WATER', value: 25 }
    ])

    await expect(repository.add(items)).rejects.toThrow(
      'The name of each item must be unique.')
  })

  it('throws an error on rejections met if not piecewise', async () => {
    class Alpha extends Entity {
      constructor (attributes = {}) {
        super(attributes)
        this.name = attributes.name || ''
        this.category = attributes.category || ''
        this.value = attributes.value || 0
      }

      static rejections = [{
        message: 'The category-name combination must be unique.',
        expression: [
          '$select', [':*'],
          ['$where', ['$and',
            ['$in', ':name', ['_map', 'name', '#items']],
            ['$in', ['$concat', ':category', ',', ':name'],
              ['_join', { map: true }, ['_map', 'category,name', '#items']]]],
          ['$from', ['$as', 'Alpha', '@Alpha']]]
        ]
      }]
    }
    const repository = new ConcreteRepository({ model: new Alpha() })
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

    let items = repository.create([
      { id: 'I010', name: 'Lake', category: 'WATER', value: 25 }
    ])
    await expect(repository.add(items)).rejects.toThrow(
      'The category-name combination must be unique.')

    items = repository.create([
      { id: 'I011', name: 'Sea', category: 'WATER', value: 50 }
    ])
    expect(await repository.add(items)).toMatchObject(
      [{ id: 'I011', name: 'Sea', category: 'WATER', value: 50 }])
  })

  it('throws an error and compensates on rejections', async () => {
    class Alpha extends Entity {
      constructor (attributes = {}) {
        super(attributes)
        this.name = attributes.name || ''
        this.category = attributes.category || ''
        this.value = attributes.value || 0
      }

      static rejections = [
        {
          examine: 'after',
          message: 'Each category value "sum" must not reach 20',
          expression: [
            '$select', [':*'],
            ['$having', ['>=', ['$sum', ':value'], 20],
              ['$group', [':category'],
                ['$from', ['$as', 'Alpha', '@Alpha']]]]
          ]
        }
      ]
    }
    const repository = new ConcreteRepository({ model: new Alpha() })
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
      { id: 'I010', name: 'Lake', category: 'WATER', value: 15 }
    ])

    await expect(repository.add(items)).rejects.toThrow(
      'Each category value "sum" must not reach 20')
    const item = await repository.find('I010')
    expect(item).toBeNull()
  })

  it('throws an error on rejections met based on a condition', async () => {
    class Alpha extends Entity {
      constructor (attributes = {}) {
        super(attributes)
        this.name = attributes.name || ''
        this.category = attributes.category || ''
        this.value = attributes.value || 0
      }

      static rejections = [
        {
          message: 'The name of each item must be unique.',
          condition: ['$in', ':name', ['_map', 'name', '#items']]
        }
      ]
    }
    const repository = new ConcreteRepository({ model: new Alpha() })
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
      { id: 'I010', name: 'Lake', category: 'WATER', value: 25 }
    ])

    await expect(repository.add(items)).rejects.toThrow(
      'The name of each item must be unique.')
  })

  it('ensures certain entities exists based on a given field', async () => {
    const model = new ConcreteEntity()
    const concreteRepository = new ConcreteRepository({ model })

    const entities = await concreteRepository.ensure([
      { name: 'Hugo' },
      { name: 'Paco' },
      { name: 'Luis' }
    ], { field: ':name' })

    let found = await concreteRepository.search()
    expect(found.length).toEqual(3)
    expect(entities).toEqual(found)

    const entity = await concreteRepository.ensure(
      { name: 'Paco' }, { field: 'name' })

    found = await concreteRepository.search()
    expect(found.length).toEqual(3)
    expect(found[1].name).toEqual(entity.name)
  })
})
