import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { tmpdir } from 'node:os'
import {
  DefaultLocator, Entity, JsonRepository, MemoryRepository, Portal
} from '../index.js'
import { Child, Parent, ProtectedEntity } from './fixtures/removal.models.js'

class Alpha extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.name = attributes.name
  }
}

class Beta extends Entity {}

class Gamma extends Entity {
  constructor (attributes) {
    super(attributes)
    this.alphaId = attributes.alphaId
  }
}

class Delta extends Entity {
  constructor (attributes) {
    super(attributes)
    this.alphaId = attributes.alphaId
    this.betaId = attributes.betaId
  }
}

class Epsilon extends Entity {
  constructor (attributes) {
    super(attributes)
    this.foreignId = attributes.foreignId
  }
}

class Zeta extends Entity {
  constructor (attributes) {
    super(attributes)
    this.value = attributes.value
    this.leftId = attributes.leftId
    this.rightId = attributes.rightId
  }
}

describe('Portal', () => {
  let portal = null

  beforeEach(function () {
    const alphaRepository = new MemoryRepository({ model: new Alpha() })
    portal = new Portal({
      repositories: [alphaRepository]
    })
  })

  it('is defined', function () {
    expect(portal).toBeTruthy()
  })

  it('can be instantiated without respositories', () => {
    portal = new Portal()

    expect(portal).toBeTruthy()
    expect(() => portal.get('Alpha')).toThrow(
      "A repository for 'Alpha' has not been provided.")
  })

  it('gets the repository associated to the given model', () => {
    const repository = portal.get('Alpha')

    expect(repository.model).toBe(Alpha)
  })

  it('sets the repository associated to the given model', () => {
    const betaRepository = new MemoryRepository({ model: new Beta() })

    portal.set(betaRepository)

    const repository = portal.get('Beta')
    expect(repository.model).toBe(Beta)
    expect(repository).toBe(betaRepository)
  })

  it('queries its repositories using symbolic expressions', async () => {
    const result = await portal.query([
      '$select', ['*'],
      ['$from', ['$as', 'Alpha', '@Alpha']]])

    expect(result).toEqual([])
  })

  it('queries its repositories using optional contexts', async () => {
    const context = { '#': { user: { id: 'A007' } } }
    const result = await portal.query([
      '$select', ['*'],
      ['$where', ['=', 'Alpha:id', '#user.id'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]], context)

    expect(result).toEqual([])
  })

  it('joins multiple models', async () => {
    portal.set(new MemoryRepository({ model: Gamma }))
    portal.get(Alpha).load([{ id: 'A001' }, { id: 'A002' }, { id: 'A003' }])
    portal.get(Gamma).load([
      { id: 'G001', alphaId: 'A001' },
      { id: 'G002', alphaId: 'A001' },
      { id: 'G003', alphaId: 'A002' },
      { id: 'G004', alphaId: 'A001' }
    ])

    const items = await portal.join([Alpha, Gamma])

    expect(items).toMatchObject([
      [{ id: 'A001' }, [
        { id: 'G001', alphaId: 'A001' },
        { id: 'G002', alphaId: 'A001' },
        { id: 'G004', alphaId: 'A001' }
      ]],
      [{ id: 'A002' }, [
        { id: 'G003', alphaId: 'A002' }
      ]],
      [{ id: 'A003' }, []]
    ])
  })

  it('joins multiple models conditioned on their fields', async () => {
    portal.set(new MemoryRepository({ model: Gamma }))
    portal.get(Alpha).load([{ id: 'A001' }, { id: 'A002' }, { id: 'A003' }])
    portal.get(Gamma).load([
      { id: 'G001', alphaId: 'A001' },
      { id: 'G002', alphaId: 'A001' },
      { id: 'G003', alphaId: 'A002' },
      { id: 'G004', alphaId: 'A001' }
    ])

    const conditions = [['=', ':id', 'A002']]
    const items = await portal.join([Alpha, Gamma], { conditions })

    expect(items).toMatchObject([
      [{ id: 'A002' }, [
        { id: 'G003', alphaId: 'A002' }
      ]]
    ])
  })

  it('joins models on many to many relationships', async () => {
    portal.set(new MemoryRepository({ model: Beta }))
    portal.set(new MemoryRepository({ model: Delta }))
    portal.get(Alpha).load([
      { id: 'A001' }, { id: 'A002' }, { id: 'A003' }, { id: 'A004' }])
    portal.get(Beta).load([{ id: 'B001' }, { id: 'B002' }, { id: 'B003' }])
    portal.get(Delta).load([
      { id: 'D001', alphaId: 'A001', betaId: 'B001' },
      { id: 'D002', alphaId: 'A001', betaId: 'B002' },
      { id: 'D003', alphaId: 'A002', betaId: 'B001' },
      { id: 'D004', alphaId: 'A003', betaId: 'B003' }
    ])

    const items = await portal.join(['Alpha', 'Delta', 'Beta'])

    expect(items).toMatchObject([
      [{ id: 'A001' }, [
        [{ id: 'D001', alphaId: 'A001', betaId: 'B001' }, { id: 'B001' }],
        [{ id: 'D002', alphaId: 'A001', betaId: 'B002' }, { id: 'B002' }]
      ]],
      [{ id: 'A002' }, [
        [{ id: 'D003', alphaId: 'A002', betaId: 'B001' }, { id: 'B001' }]
      ]],
      [{ id: 'A003' }, [
        [{ id: 'D004', alphaId: 'A003', betaId: 'B003' }, { id: 'B003' }]
      ]],
      [{ id: 'A004' }, []]
    ])
  })

  it('joins one to many relationships on a custom key', async () => {
    portal.set(new MemoryRepository({ model: Epsilon }))
    portal.get(Alpha).load([{ id: 'A001' }, { id: 'A002' }, { id: 'A003' }])
    portal.get(Epsilon).load([
      { id: 'E001', foreignId: 'A001' },
      { id: 'E002', foreignId: 'A001' },
      { id: 'E003', foreignId: 'A002' },
      { id: 'E004', foreignId: 'A001' }
    ])

    const key = 'foreignId'
    const items = await portal.join([Alpha, Epsilon], { key })

    expect(items).toMatchObject([
      [{ id: 'A001' }, [
        { id: 'E001', foreignId: 'A001' },
        { id: 'E002', foreignId: 'A001' },
        { id: 'E004', foreignId: 'A001' }
      ]],
      [{ id: 'A002' }, [
        { id: 'E003', foreignId: 'A002' }
      ]],
      [{ id: 'A003' }, []]
    ])
  })

  it('joins many to many relationships on custom keys', async () => {
    portal.set(new MemoryRepository({ model: Beta }))
    portal.set(new MemoryRepository({ model: Zeta }))
    portal.get(Alpha).load([
      { id: 'A001' }, { id: 'A002' }, { id: 'A003' }, { id: 'A004' }])
    portal.get(Beta).load([{ id: 'B001' }, { id: 'B002' }, { id: 'B003' }])
    portal.get(Zeta).load([
      { id: 'Z001', leftId: 'A001', rightId: 'B001', value: 10 },
      { id: 'Z002', leftId: 'A001', rightId: 'B002', value: 20 },
      { id: 'Z003', leftId: 'A002', rightId: 'B001', value: 30 },
      { id: 'Z004', leftId: 'A003', rightId: 'B003', value: 40 }
    ])

    const key = 'leftId,rightId'
    const conditions = [[], ['<', ':value', 25]]
    const items = await portal.join([Alpha, Zeta, Beta], { conditions, key })

    expect(items).toMatchObject([
      [{ id: 'A001' }, [
        [{ id: 'Z001', leftId: 'A001', rightId: 'B001' }, { id: 'B001' }],
        [{ id: 'Z002', leftId: 'A001', rightId: 'B002' }, { id: 'B002' }]
      ]],
      [{ id: 'A002' }, []],
      [{ id: 'A003' }, []],
      [{ id: 'A004' }, []]
    ])
  })

  it('joins multiple models segmenting the results', async () => {
    portal.set(new MemoryRepository({ model: Gamma }))
    portal.get(Alpha).load([{ id: 'A001' }, { id: 'A002' }, { id: 'A003' }])
    portal.get(Gamma).load([
      { id: 'G001', alphaId: 'A001' },
      { id: 'G002', alphaId: 'A001' },
      { id: 'G003', alphaId: 'A002' },
      { id: 'G004', alphaId: 'A001' }
    ])

    const segments = [{ limit: 1 }, { limit: 2, offset: 1, order: 'id' }]
    const items = await portal.join([Alpha, Gamma], { segments })

    expect(items).toMatchObject([
      [{ id: 'A001' }, [
        { id: 'G002', alphaId: 'A001' },
        { id: 'G004', alphaId: 'A001' }
      ]]
    ])
  })

  it('gathers a set of records meeting a condition', async () => {
    portal.set(new MemoryRepository({ model: Gamma }))
    portal.get(Alpha).load([{ id: 'A001' }, { id: 'A002' }, { id: 'A003' }])
    portal.get(Gamma).load([
      { id: 'G001', alphaId: 'A001' },
      { id: 'G002', alphaId: 'A001' },
      { id: 'G003', alphaId: 'A002' },
      { id: 'G004', alphaId: 'A001' }
    ])

    const items = await portal.gather(Gamma, ['=', ':alphaId', 'A001'])

    expect(items).toMatchObject([
      [{ id: 'G001', alphaId: 'A001' }],
      [{ id: 'G002', alphaId: 'A001' }],
      [{ id: 'G004', alphaId: 'A001' }]
    ])
  })

  it('gathers a set of records joining them with references', async () => {
    portal.set(new MemoryRepository({ model: Gamma }))
    portal.get(Alpha).load([{ id: 'A001' }, { id: 'A002' }, { id: 'A003' }])
    portal.get(Gamma).load([
      { id: 'G001', alphaId: 'A001' },
      { id: 'G002', alphaId: 'A001' },
      { id: 'G003', alphaId: 'A002' },
      { id: 'G004', alphaId: 'A001' }
    ])

    const items = await portal.gather(
      Gamma, ['=', ':alphaId', 'A001'], [Alpha])

    expect(items).toMatchObject([
      [{ id: 'G001', alphaId: 'A001' }, { id: 'A001' }],
      [{ id: 'G002', alphaId: 'A001' }, { id: 'A001' }],
      [{ id: 'G004', alphaId: 'A001' }, { id: 'A001' }]
    ])
  })

  it('gathers a set of records joining by a specified field', async () => {
    portal.set(new MemoryRepository({ model: Gamma }))
    portal.get(Alpha).load([{ id: 'A001' }, { id: 'A002' }, { id: 'A003' }])
    portal.get(Gamma).load([
      { id: 'G001', alphaId: 'A001' },
      { id: 'G002', alphaId: 'A001' },
      { id: 'G003', alphaId: 'A002' },
      { id: 'G004', alphaId: 'A001' }
    ])

    const items = await portal.gather(
      Gamma, ['=', ':alphaId', 'A001'], [[Alpha, 'alphaId']])

    expect(items).toMatchObject([
      [{ id: 'G001', alphaId: 'A001' }, { id: 'A001' }],
      [{ id: 'G002', alphaId: 'A001' }, { id: 'A001' }],
      [{ id: 'G004', alphaId: 'A001' }, { id: 'A001' }]
    ])
  })

  it('returns a single tuple if an scalar id is provided', async () => {
    portal.set(new MemoryRepository({ model: Gamma }))
    portal.get(Alpha).load([{ id: 'A001' }, { id: 'A002' }, { id: 'A003' }])
    portal.get(Gamma).load([
      { id: 'G001', alphaId: 'A001' },
      { id: 'G002', alphaId: 'A001' },
      { id: 'G003', alphaId: 'A002' },
      { id: 'G004', alphaId: 'A001' }
    ])

    const [gamma, alpha] = await portal.gather(Gamma, 'G003', [Alpha])

    expect(gamma).toBeInstanceOf(Gamma)
    expect(alpha).toBeInstanceOf(Alpha)
    expect(gamma).toMatchObject({ id: 'G003', alphaId: 'A002' })
    expect(alpha).toMatchObject({ id: 'A002' })
  })

  it('gathers multiple entities together', async () => {
    portal.set(new MemoryRepository({ model: Beta }))
    portal.set(new MemoryRepository({ model: Delta }))
    portal.get(Alpha).load([{ id: 'A001' }, { id: 'A002' }, { id: 'A003' }])
    portal.get(Beta).load([{ id: 'B001' }, { id: 'B002' }, { id: 'B003' }])
    portal.get(Delta).load([
      { id: 'D001', alphaId: 'A001', betaId: 'B002' },
      { id: 'D002', alphaId: 'A001', betaId: 'B003' },
      { id: 'D003', alphaId: 'A002', betaId: 'B001' },
      { id: 'D004', alphaId: 'A003', betaId: 'B001' }
    ])

    const [delta, alpha, beta] = await portal.gather(
      Delta, 'D003', [Alpha, Beta])

    expect(delta).toBeInstanceOf(Delta)
    expect(alpha).toBeInstanceOf(Alpha)
    expect(beta).toBeInstanceOf(Beta)

    expect(delta).toMatchObject({ id: 'D003', alphaId: 'A002', betaId: 'B001' })
    expect(alpha).toMatchObject({ id: 'A002' })
    expect(beta).toMatchObject({ id: 'B001' })
  })

  it('gathers multiple entities on custom keys', async () => {
    portal.set(new MemoryRepository({ model: Beta }))
    portal.set(new MemoryRepository({ model: Zeta }))
    portal.get(Alpha).load([
      { id: 'A001' }, { id: 'A002' }, { id: 'A003' }, { id: 'A004' }])
    portal.get(Beta).load([{ id: 'B001' }, { id: 'B002' }, { id: 'B003' }])
    portal.get(Zeta).load([
      { id: 'Z001', leftId: 'A001', rightId: 'B001', value: 10 },
      { id: 'Z002', leftId: 'A001', rightId: 'B002', value: 20 },
      { id: 'Z003', leftId: 'A002', rightId: 'B001', value: 30 },
      { id: 'Z004', leftId: 'A003', rightId: 'B003', value: 40 }
    ])

    const [zeta, alpha, beta] = await portal.gather(
      Zeta, 'Z003', [[Alpha, 'leftId'], [Beta, 'rightId']])

    expect(zeta).toBeInstanceOf(Zeta)
    expect(alpha).toBeInstanceOf(Alpha)
    expect(beta).toBeInstanceOf(Beta)

    expect(zeta).toMatchObject(
      { id: 'Z003', leftId: 'A002', rightId: 'B001', value: 30 })
    expect(alpha).toMatchObject({ id: 'A002' })
    expect(beta).toMatchObject({ id: 'B001' })
  })

  it('gathers entities returning null on empty references', async () => {
    portal.set(new MemoryRepository({ model: Beta }))
    portal.set(new MemoryRepository({ model: Zeta }))
    portal.get(Alpha).load([
      { id: 'A001' }, { id: 'A002' }, { id: 'A003' }, { id: 'A004' }])
    portal.get(Beta).load([{ id: 'B001' }, { id: 'B002' }, { id: 'B003' }])
    portal.get(Zeta).load([
      { id: 'Z001', leftId: 'A001', rightId: 'B001', value: 10 },
      { id: 'Z002', leftId: 'A001', rightId: 'B002', value: 20 },
      { id: 'Z003', leftId: 'A002', rightId: 'B001', value: 30 },
      { id: 'Z004', leftId: null, rightId: 'B003', value: 40 }
    ])

    const [zeta, alpha, beta] = await portal.gather(
      Zeta, 'Z004', [[Alpha, 'leftId'], [Beta, 'rightId']])

    expect(zeta).toBeInstanceOf(Zeta)
    expect(alpha).toBeNull()
    expect(beta).toBeInstanceOf(Beta)

    expect(zeta).toMatchObject(
      { id: 'Z004', leftId: null, rightId: 'B003', value: 40 })
    expect(beta).toMatchObject({ id: 'B003' })
  })

  it('gathers entities returning null on missing values', async () => {
    portal.set(new MemoryRepository({ model: Beta }))
    portal.set(new MemoryRepository({ model: Zeta }))
    portal.get(Alpha).load([
      { id: 'A001' }, { id: 'A002' }, { id: 'A003' }, { id: 'A004' }])
    portal.get(Beta).load([{ id: 'B001' }, { id: 'B002' }, { id: 'B003' }])
    portal.get(Zeta).load([
      { id: 'Z001', leftId: 'A001', rightId: 'B001', value: 10 },
      { id: 'Z002', leftId: 'A001', rightId: 'B004', value: 20 },
      { id: 'Z003', leftId: 'A002', rightId: 'B001', value: 30 },
      { id: 'Z004', leftId: 'A003', rightId: 'B003', value: 40 }
    ])

    const [zeta, alpha, beta] = await portal.gather(
      Zeta, 'Z002', [[Alpha, 'leftId'], [Beta, 'rightId']])

    expect(zeta).toBeInstanceOf(Zeta)
    expect(alpha).toBeInstanceOf(Alpha)
    expect(beta).toBeNull()

    expect(zeta).toMatchObject(
      { id: 'Z002', leftId: 'A001', rightId: 'B004', value: 20 })
    expect(alpha).toMatchObject({ id: 'A001' })
  })
})

class Related extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.name = attributes.name || ''
  }
}

const reservedName = {
  operation: 'add',
  message: 'Related records reserve this name.',
  expression: [
    '$select', [':id'],
    ['$where', ['$in', ':name', ['_map', 'name', '#items']],
      ['$from', ['$as', 'Related', '@Related']]]
  ]
}

const invalidAddition = {
  operation: 'add',
  examine: 'after',
  message: 'Invalid records cannot remain.',
  condition: ['=', ':status', 'invalid']
}

const singleMember = {
  operation: 'remove',
  examine: 'after',
  message: 'A category cannot have exactly one member.',
  expression: [
    '$select', [':category'],
    ['$having', ['=', ['$count', ':id'], 1],
      ['$group', [':category'],
        ['$from', ['$as', 'Model', '@Model']]]]
  ]
}

const members = [
  { id: 'M001', category: 'team', name: 'First member' },
  { id: 'M002', category: 'team', name: 'Second member' },
  { id: 'M003', category: 'team', name: 'Third member' }
]

function setup (rejections, records = []) {
  class Model extends Entity {
    constructor (attributes = {}) {
      super(attributes)
      this.name = attributes.name || ''
      this.category = attributes.category || ''
    }

    static rejections = rejections
  }

  const repository = new MemoryRepository({ model: Model })
  repository.load(records)
  const related = new MemoryRepository({ model: Related })
  related.load([{ id: 'R001', name: 'Reserved' }])
  const portal = new Portal({ repositories: [repository, related] })
  return { Model, repository, related, portal }
}

function deferred () {
  const pending = {}
  pending.promise = new Promise((resolve, reject) => {
    pending.resolve = resolve
    pending.reject = reject
  })
  return pending
}

function gate (repository, operation) {
  const method = `_${operation}`
  const original = repository[method].bind(repository)
  const started = deferred()
  const completion = deferred()
  jest.spyOn(repository, method).mockImplementationOnce(async items => {
    started.resolve()
    await completion.promise
    return original(items)
  })
  return {
    started: started.promise,
    resolve: completion.resolve,
    reject: completion.reject
  }
}

function mutationFixture (operation) {
  const fixture = setup(
    [operation === 'add' ? invalidAddition : singleMember],
    operation === 'remove' ? members.slice(0, 2) : [])
  fixture.items = operation === 'add'
    ? fixture.repository.create({ id: 'M001', name: 'Invalid', status: 'invalid' })
    : fixture.repository.create({ id: 'M001' })
  fixture.message = operation === 'add'
    ? invalidAddition.message
    : singleMember.message
  return fixture
}

describe('Portal mutation orchestration', () => {
  it.each(['add', 'remove'])(
    'infers the model for singleton and homogeneous batch %s operations',
    async operation => {
      const { Model, repository, portal } = setup([], operation === 'remove' ? members : [])

      const single = await portal[operation](repository.create(members[0]))
      const batch = await portal[operation](repository.create(members.slice(1)))

      expect(single).toBeInstanceOf(Model)
      expect(single).toMatchObject(members[0])
      expect(Array.isArray(batch)).toBe(true)
      expect(batch).toHaveLength(2)
      expect(batch.every(item => item instanceof Model)).toBe(true)
      expect(batch).toMatchObject(members.slice(1))
    })

  it.each(['add', 'remove'])(
    'rejects mixed-model %s batches before any queries or mutations',
    async operation => {
      const { repository, related, portal } = setup(
        [reservedName, { ...singleMember, examine: 'before' }], members.slice(0, 2))
      const mutateModel = jest.spyOn(repository, `_${operation}`)
      const mutateRelated = jest.spyOn(related, `_${operation}`)
      const queryPortal = jest.spyOn(portal, 'query')
      const queryModel = jest.spyOn(repository, 'query')
      const queryRelated = jest.spyOn(related, 'query')

      await expect(portal[operation]([
        repository.create(members[0]), related.create({ id: 'R001' })
      ])).rejects.toThrow('Portal mutation batches must contain a single model.')

      expect(mutateModel).not.toHaveBeenCalled()
      expect(mutateRelated).not.toHaveBeenCalled()
      expect(queryPortal).not.toHaveBeenCalled()
      expect(queryModel).not.toHaveBeenCalled()
      expect(queryRelated).not.toHaveBeenCalled()
      expect(Object.values(await repository.storer.retrieve('default')))
        .toMatchObject(members.slice(0, 2))
      expect(await related.storer.retrieve('default')).toHaveProperty('R001')
    })

  it.each(['add', 'remove'])(
    'rejects invalid %s inputs before queries or mutations',
    async operation => {
      const { repository, portal } = setup([reservedName], members)
      const mutate = jest.spyOn(repository, `_${operation}`)
      const query = jest.spyOn(portal, 'query')
      const queryModel = jest.spyOn(repository, 'query')
      const valid = repository.create(members[0])
      const invalid = [
        {}, { id: 'M001' }, null, undefined, 'M001', 1, true,
        [{}], [null], [undefined], [1], [valid, {}], [valid, null], [[valid]]
      ]

      for (const items of invalid) {
        await expect(portal[operation](items)).rejects.toThrow(TypeError)
      }

      expect(mutate).not.toHaveBeenCalled()
      expect(query).not.toHaveBeenCalled()
      expect(queryModel).not.toHaveBeenCalled()
    })

  it.each(['add', 'remove'])(
    'accepts an empty %s batch without repositories or queries',
    async operation => {
      const portal = new Portal()
      const query = jest.spyOn(portal, 'query')

      await expect(portal[operation]([])).resolves.toEqual([])

      expect(query).not.toHaveBeenCalled()
    })

  it.each(['add', 'remove'])(
    'rejects an unregistered %s model before queries or mutations',
    async operation => {
      class Unknown extends Entity {}
      const { repository, portal } = setup([reservedName], members)
      const mutate = jest.spyOn(repository, `_${operation}`)
      const query = jest.spyOn(portal, 'query')
      const queryModel = jest.spyOn(repository, 'query')

      await expect(portal[operation](new Unknown({ id: 'unknown' })))
        .rejects.toThrow("A repository for 'Unknown' has not been provided.")

      expect(mutate).not.toHaveBeenCalled()
      expect(query).not.toHaveBeenCalled()
      expect(queryModel).not.toHaveBeenCalled()
    })

  it('checks a related collection before adding records', async () => {
    const { repository, related, portal } = setup([reservedName])
    const add = jest.spyOn(repository, '_add')

    await expect(portal.add(repository.create({
      id: 'M001', name: 'Reserved'
    }))).rejects.toThrow(reservedName.message)

    expect(add).not.toHaveBeenCalled()
    expect(await repository.find('M001')).toBeNull()
    expect(await related.find('R001')).toMatchObject({ name: 'Reserved' })
    await expect(portal.add(repository.create({
      id: 'M002', name: 'Available'
    }))).resolves.toMatchObject({ id: 'M002', name: 'Available' })
  })

  it('evaluates a callable Portal rejection message before mutation', async () => {
    const message = jest.fn(() => 'This name is reserved by a related record.')
    const { repository, portal } = setup([{ ...reservedName, message }])
    const add = jest.spyOn(repository, '_add')

    await expect(portal.add(repository.create({
      id: 'M001', name: 'Reserved'
    }))).rejects.toThrow('This name is reserved by a related record.')

    expect(message).toHaveBeenCalledTimes(1)
    expect(add).not.toHaveBeenCalled()
  })

  it('fails closed when a standalone repository cannot resolve a declared related collection', async () => {
    const { repository, portal } = setup([reservedName])
    const add = jest.spyOn(repository, '_add')
    const query = jest.spyOn(portal, 'query')

    await expect(repository.add(repository.create({
      id: 'M001', name: 'Available'
    }))).rejects.toThrow()

    expect(add).not.toHaveBeenCalled()
    expect(query).not.toHaveBeenCalled()
    expect(await repository.find('M001')).toBeNull()
  })

  it('enforces declarations locally when a standalone repository can resolve them', async () => {
    const uniqueName = {
      message: 'Local names must be unique.',
      condition: ['$in', ':name', ['_map', 'name', '#items']]
    }
    const { repository, portal } = setup(
      [uniqueName], [{ id: 'M001', name: 'Existing' }])
    const query = jest.spyOn(portal, 'query')

    await expect(repository.add(repository.create({
      id: 'M002', name: 'Reserved'
    }))).resolves.toMatchObject({ id: 'M002' })
    await expect(repository.add(repository.create({
      id: 'M003', name: 'Existing'
    }))).rejects.toThrow(uniqueName.message)

    expect(query).not.toHaveBeenCalled()
    expect(await repository.find('M003')).toBeNull()
  })

  it('checks each applicable add rule once through Portal before calling the storage hook', async () => {
    const { repository, portal } = setup([reservedName, {
      condition: ['$in', ':name', ['_map', 'name', '#items']]
    }])
    const add = jest.spyOn(repository, '_add')
    const publicAdd = jest.spyOn(repository, 'add')
    const find = jest.spyOn(repository, 'find')
    const query = jest.spyOn(portal, 'query')

    await portal.add(repository.create({ id: 'M001', name: 'Available' }))

    expect(add).toHaveBeenCalledTimes(1)
    expect(publicAdd).not.toHaveBeenCalled()
    expect(find).not.toHaveBeenCalled()
    expect(query).toHaveBeenCalledTimes(2)
  })

  it.each(['add', 'remove'])(
    'waits for the %s storage hook before checking after rules',
    async operation => {
      const { repository, portal, items, message } = mutationFixture(operation)
      const mutation = gate(repository, operation)
      const query = jest.spyOn(portal, 'query')
      const rejected = expect(portal[operation](items)).rejects.toThrow(message)

      await mutation.started
      const checkedBeforeMutation = query.mock.calls.length > 0
      mutation.resolve()
      await rejected

      expect(checkedBeforeMutation).toBe(false)
      if (operation === 'add') {
        expect(await repository.find('M001')).toBeNull()
      } else {
        expect(await repository.find('M001')).toMatchObject(members[0])
      }
    })

  it.each(['add', 'remove'])(
    'propagates a failed %s storage hook without running after checks',
    async operation => {
      const { repository, portal, items } = mutationFixture(operation)
      const mutation = gate(repository, operation)
      const query = jest.spyOn(portal, 'query')
      const failure = new Error(`${operation} unavailable`)
      const rejected = expect(portal[operation](items)).rejects.toBe(failure)

      await mutation.started
      mutation.reject(failure)
      await rejected

      expect(query).not.toHaveBeenCalled()
    })

  it.each(['add', 'remove'])(
    'awaits storage compensation when %s after checks reject',
    async operation => {
      const { repository, portal, items, message } = mutationFixture(operation)
      const compensation = gate(repository, operation === 'add' ? 'remove' : 'add')
      let settled = false
      const mutation = portal[operation](items).finally(() => { settled = true })
      const rejected = expect(mutation).rejects.toThrow(message)

      await compensation.started
      const duringCompensation = await repository.find('M001')
      const settledBeforeCompensation = settled
      compensation.resolve()
      await rejected

      expect(settledBeforeCompensation).toBe(false)
      if (operation === 'add') {
        expect(duringCompensation).toMatchObject({ id: 'M001', status: 'invalid' })
        expect(await repository.find('M001')).toBeNull()
      } else {
        expect(duringCompensation).toBeNull()
        expect(await repository.find('M001')).toMatchObject(members[0])
      }
    })

  it.each(['add', 'remove'])(
    'propagates failed storage compensation after portal %s',
    async operation => {
      const { repository, portal, items } = mutationFixture(operation)
      const compensation = gate(repository, operation === 'add' ? 'remove' : 'add')
      const failure = new Error('Compensation unavailable')
      const rejected = expect(portal[operation](items)).rejects.toBe(failure)

      await compensation.started
      compensation.reject(failure)
      await rejected
    })

  it('restores overwritten preimages and removes only newly inserted records after a rejected upsert', async () => {
    const { repository, portal } = setup([invalidAddition], members.slice(0, 2))
    const remove = jest.spyOn(repository, '_remove')
    const add = jest.spyOn(repository, '_add')
    const items = repository.create([
      { id: 'M001', category: 'changed', name: 'Overwritten', status: 'invalid' },
      { id: 'M003', category: 'team', name: 'New member' }
    ])

    await expect(portal.add(items)).rejects.toThrow(invalidAddition.message)

    expect(remove).toHaveBeenCalledTimes(1)
    expect([remove.mock.calls[0][0]].flat().map(item => item.id)).toEqual(['M003'])
    expect(add).toHaveBeenCalledTimes(2)
    expect([add.mock.calls[1][0]].flat()).toMatchObject([members[0]])
    expect(await repository.search([], { order: 'id' })).toMatchObject(members.slice(0, 2))
    expect(await repository.find('M003')).toBeNull()
  })

  it('restores a rejected update without deleting the existing record', async () => {
    const { repository, portal } = setup([invalidAddition], members.slice(0, 1))
    const remove = jest.spyOn(repository, '_remove')

    await expect(portal.add(repository.create({
      id: 'M001', name: 'Changed', category: 'changed', status: 'invalid'
    }))).rejects.toThrow(invalidAddition.message)

    expect(remove).not.toHaveBeenCalled()
    expect(await repository.find('M001')).toMatchObject(members[0])
  })

  it('restores only records actually removed from a batch', async () => {
    const { repository, portal } = setup([singleMember], members)
    const add = jest.spyOn(repository, '_add')

    await expect(portal.remove(repository.create([
      { id: 'M001' }, { id: 'M002' }, { id: 'missing' }
    ]))).rejects.toThrow(singleMember.message)

    expect(add).toHaveBeenCalledTimes(1)
    expect([add.mock.calls[0][0]].flat()).toMatchObject(members.slice(0, 2))
    expect(await repository.search([], { order: 'id' })).toMatchObject(members)
    expect(await repository.find('missing')).toBeNull()
  })

  it.each(['add', 'remove'])(
    'compensates %s when a portal after query fails',
    async operation => {
      const { repository, portal, items } = mutationFixture(operation)
      const failure = new Error('Portal query unavailable')
      jest.spyOn(portal, 'query').mockRejectedValueOnce(failure)

      await expect(portal[operation](items)).rejects.toBe(failure)

      if (operation === 'add') {
        expect(await repository.find('M001')).toBeNull()
      } else {
        expect(await repository.find('M001')).toMatchObject(members[0])
      }
    })

  it('restores the prior state through storage hooks without revalidating additions', async () => {
    const { repository, portal } = setup([singleMember, {
      message: 'Blocked records prevent additions.',
      condition: ['=', ':status', 'blocked']
    }], [members[0], { ...members[1], status: 'blocked' }])
    const add = jest.spyOn(repository, '_add')
    const publicAdd = jest.spyOn(repository, 'add')
    const query = jest.spyOn(portal, 'query')

    await expect(portal.remove(repository.create({ id: 'M001' }))).rejects.toThrow(
      singleMember.message)

    expect(add).toHaveBeenCalledTimes(1)
    expect(publicAdd).not.toHaveBeenCalled()
    expect(query).toHaveBeenCalledTimes(1)
    expect(await repository.find('M001')).toMatchObject(members[0])
    expect(await repository.find('M002')).toMatchObject({ status: 'blocked' })
  })

  it.each(['add', 'remove'])(
    'evaluates an unmarked %s after rule and compensates exactly once',
    async operation => {
      const { repository, portal, items, message } = mutationFixture(operation)
      const query = jest.spyOn(portal, 'query')
      const mutate = jest.spyOn(repository, `_${operation}`)
      const compensate = jest.spyOn(repository, operation === 'add' ? '_remove' : '_add')
      const publicMutation = jest.spyOn(repository, operation)

      await expect(portal[operation](items)).rejects.toThrow(message)

      expect(query).toHaveBeenCalledTimes(1)
      expect(mutate).toHaveBeenCalledTimes(1)
      expect(compensate).toHaveBeenCalledTimes(1)
      expect(publicMutation).not.toHaveBeenCalled()
      if (operation === 'add') {
        expect(await repository.find('M001')).toBeNull()
      } else {
        expect(await repository.find('M001')).toMatchObject(members[0])
      }
    })
})

class GroupBoundary extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.category = attributes.category || ''
    this.name = attributes.name || ''
  }

  static rejections = [{
    operation: 'remove',
    examine: 'after',
    message: 'A category cannot have exactly one member.',
    expression: [
      '$select', [':category'],
      ['$having', ['=', ['$count', ':id'], 1],
        ['$group', [':category'],
          ['$from', ['$as', 'GroupBoundary', '@GroupBoundary']]]]
    ]
  }]
}

describe.each([
  ['MemoryRepository', MemoryRepository],
  ['JsonRepository', JsonRepository]
])('%s portal removal rejections', (_name, Repository) => {
  let parents
  let children
  let portal
  let options
  let directory

  beforeEach(async () => {
    options = {}
    if (Repository === JsonRepository) {
      directory = await fs.mkdtemp(path.join(tmpdir(), 'modelark-removal-'))
      options = { directory, fs, path }
    }

    children = new Repository({ model: Child, ...options })
    parents = new Repository({ model: Parent, ...options })
    portal = new Portal({ repositories: [parents, children] })

    await parents.add(parents.create([
      { id: 'P001', name: 'Referenced parent' },
      { id: 'P002', name: 'Unreferenced parent' },
      { id: 'P003', name: 'Locked parent', status: 'locked' }
    ]))
    await children.add(children.create({
      id: 'C001', parentId: 'P001', name: 'Related child'
    }))
  })

  afterEach(async () => {
    if (directory) await fs.rm(directory, { recursive: true, force: true })
    directory = null
  })

  it('rejects removing a parent while a related child exists', async () => {
    await expect(portal.remove(new Parent({ id: 'P001' }))).rejects.toThrow(
      'Cannot remove a parent with related children.')

    expect(await parents.find('P001')).toMatchObject({ id: 'P001' })
    expect(await children.find('C001')).toMatchObject({ parentId: 'P001' })
  })

  it('keeps every record unchanged when one parent in a batch is referenced', async () => {
    const parentRecords = await parents.search()
    const childRecords = await children.search()

    await expect(portal.remove(parents.create([
      { id: 'P002' }, { id: 'P001' }
    ]))).rejects.toThrow('Cannot remove a parent with related children.')

    expect(await parents.search()).toEqual(parentRecords)
    expect(await children.search()).toEqual(childRecords)
  })

  it('removes an unreferenced parent despite unrelated children and locked parents', async () => {
    await expect(portal.remove(new Parent({ id: 'P002' }))).resolves.toMatchObject({
      id: 'P002'
    })

    expect(await parents.find('P002')).toBeNull()
    expect(await parents.find('P001')).toMatchObject({ id: 'P001' })
    expect(await parents.find('P003')).toMatchObject({ status: 'locked' })
    expect(await children.find('C001')).toMatchObject({ parentId: 'P001' })
  })

  it('allows removing a parent after all its related children are removed', async () => {
    await portal.remove(new Child({ id: 'C001' }))

    await expect(portal.remove(new Parent({ id: 'P001' }))).resolves.toMatchObject({
      id: 'P001'
    })

    expect(await parents.find('P001')).toBeNull()
    expect(await children.find('C001')).toBeNull()
  })

  it('reads fresh related records after an earlier allowed removal', async () => {
    const parent = await portal.remove(new Parent({ id: 'P002' }))
    await portal.add(parent)
    await portal.add(children.create({
      id: 'C002', parentId: 'P002', name: 'New related child'
    }))

    await expect(portal.remove(new Parent({ id: 'P002' }))).rejects.toThrow(
      'Cannot remove a parent with related children.')

    expect(await parents.find('P002')).toMatchObject({ id: 'P002' })
    expect(await children.find('C002')).toMatchObject({ parentId: 'P002' })
  })

  it('checks the repositories in each portal namespace', async () => {
    const createPortal = async location => {
      const locator = new DefaultLocator({ location })
      const parents = new Repository({ model: Parent, locator, ...options })
      const children = new Repository({ model: Child, locator, ...options })
      await parents.add(parents.create({ id: 'P100' }))
      return new Portal({ repositories: [parents, children] })
    }
    const tenantA = await createPortal('tenant-a')
    const tenantB = await createPortal('tenant-b')
    const childRepository = tenantB.get(Child)
    await tenantB.add(childRepository.create({
      id: 'C100', parentId: 'P100'
    }))

    await expect(tenantA.remove(new Parent({ id: 'P100' }))).resolves.toMatchObject({
      id: 'P100'
    })
    await expect(tenantB.remove(new Parent({ id: 'P100' }))).rejects.toThrow(
      'Cannot remove a parent with related children.')

    expect(await tenantA.get(Parent).find('P100')).toBeNull()
    expect(await tenantB.get(Parent).find('P100')).toMatchObject({ id: 'P100' })
  })

  it('preserves the parent when a related repository cannot be searched', async () => {
    children.search = async () => {
      throw new Error('Child repository unavailable.')
    }

    await expect(portal.remove(new Parent({ id: 'P001' }))).rejects.toThrow(
      'Child repository unavailable.')

    expect(await parents.find('P001')).toMatchObject({ id: 'P001' })
  })

  it('rejects a missing related repository before deleting the parent', async () => {
    const incompletePortal = new Portal({ repositories: [parents] })

    await expect(incompletePortal.remove(new Parent({ id: 'P001' }))).rejects.toThrow()

    expect(await parents.find('P001')).toMatchObject({ id: 'P001' })
  })

  it('uses repositories registered after portal construction', async () => {
    const incompletePortal = new Portal({ repositories: [parents] })
    incompletePortal.set(children)

    await expect(incompletePortal.remove(new Parent({ id: 'P001' }))).rejects.toThrow(
      'Cannot remove a parent with related children.')
    await incompletePortal.remove(new Child({ id: 'C001' }))

    await expect(incompletePortal.remove(new Parent({ id: 'P001' }))).resolves
      .toMatchObject({ id: 'P001' })
    expect(await parents.find('P001')).toBeNull()
  })

  it('rejects direct removal when its cross-model rule cannot resolve related data', async () => {
    await expect(parents.remove({ id: 'P001' })).rejects.toThrow()

    expect(await parents.find('P001')).toMatchObject({ id: 'P001' })
    expect(await children.find('C001')).toMatchObject({ parentId: 'P001' })
  })

  it('keeps persisted collection data authoritative over query context', async () => {
    const expression = [
      '$select', [':id', ':status'],
      ['$where', ['=', ':id', '#target.id'],
        ['$from', ['$as', 'Parent', '@Parent']]]
    ]

    const result = await portal.query(expression, {
      '#': { target: { id: 'P003' } },
      '@': { Parent: [{ id: 'P003', status: 'open' }] }
    })

    expect(result).toEqual([{ id: 'P003', status: 'locked' }])
  })

  it('joins registered repositories using qualified fields and query context', async () => {
    await children.add(children.create([
      { id: 'C002', parentId: 'P002', name: 'First matching child' },
      { id: 'C003', parentId: 'P002', name: 'Second matching child' }
    ]))
    const expression = [
      '$select', ['Parent:name', 'Child:name'],
      ['$join', ['$as', 'Child', '@Child'],
        ['$and',
          ['=', 'Parent:id', 'Child:parentId'],
          ['=', 'Parent:id', '#parent.id']],
        ['$from', ['$as', 'Parent', '@Parent']]]
    ]

    const result = await portal.query(expression, {
      '#': { parent: { id: 'P002' } }
    })

    expect(result).toEqual([
      { Parentname: 'Unreferenced parent', Childname: 'First matching child' },
      { Parentname: 'Unreferenced parent', Childname: 'Second matching child' }
    ])
  })

  if (Repository === JsonRepository) {
    it.each(['malformed JSON', 'an unreadable path'])(
      'preserves the parent file when the related source contains %s',
      async corruption => {
        const location = parents.locator.location()
        const parentFile = path.join(directory, location, 'Parent.json')
        const childFile = path.join(directory, location, 'Child.json')
        const parentContent = await fs.readFile(parentFile, 'utf8')
        if (corruption === 'malformed JSON') {
          await fs.writeFile(childFile, '{"C001":')
        } else {
          await fs.rm(childFile)
          await fs.mkdir(childFile)
        }

        await expect(portal.remove(new Parent({ id: 'P001' }))).rejects.toThrow()

        expect(await fs.readFile(parentFile, 'utf8')).toBe(parentContent)
        expect(JSON.parse(parentContent)).toHaveProperty('P001')
      }
    )
  }

  it.each([
    ['only its id', { id: 'P003' }],
    ['a stale unlocked status', { id: 'P003', status: 'open' }]
  ])('checks stored state when removal receives %s', async (_description, item) => {
    await expect(portal.remove(parents.create(item))).rejects.toThrow(
      'Cannot remove a locked parent.')

    expect(await parents.find('P003')).toMatchObject({ status: 'locked' })
  })

  it('keeps a mixed batch unchanged when a targeted parent is locked', async () => {
    const records = await parents.search()

    await expect(portal.remove(parents.create([
      { id: 'P002' }, { id: 'P003' }
    ]))).rejects.toThrow('Cannot remove a locked parent.')

    expect(await parents.search()).toEqual(records)
  })

  it('allows normal additions even when removal restrictions apply', async () => {
    const parent = parents.create({
      id: 'P004', name: 'New locked parent', status: 'locked'
    })

    await expect(portal.add(parent)).resolves.toMatchObject({
      id: 'P004', status: 'locked'
    })
    expect(await parents.find('P004')).toMatchObject({
      name: 'New locked parent'
    })
  })

  it('accepts an empty removal without changing stored records', async () => {
    const records = await parents.search()

    await expect(portal.remove([])).resolves.toEqual([])

    expect(await parents.search()).toEqual(records)
  })

  it('enforces local logical boundaries without a portal', async () => {
    const repository = new Repository({ model: ProtectedEntity, ...options })
    await repository.add(repository.create([
      { id: 'E001', status: 'locked' },
      { id: 'E002', status: 'open' }
    ]))

    await expect(repository.remove({ id: 'E001', status: 'open' })).rejects.toThrow(
      'Cannot remove a locked entity.')
    await expect(repository.remove({ id: 'E002' })).resolves.toMatchObject({
      id: 'E002'
    })

    expect(await repository.find('E001')).toMatchObject({ status: 'locked' })
    expect(await repository.find('E002')).toBeNull()
  })

  it('restores persisted records when removal crosses a logical boundary afterward', async () => {
    const repository = new Repository({ model: GroupBoundary, ...options })
    const members = repository.create([
      { id: 'G001', category: 'team', name: 'First member' },
      { id: 'G002', category: 'team', name: 'Second member' },
      { id: 'G003', category: 'team', name: 'Third member' }
    ])
    await repository.add(members)

    await expect(repository.remove([
      { id: 'G001' }, { id: 'G002' }, { id: 'missing' }
    ])).rejects.toThrow('A category cannot have exactly one member.')

    const restored = await repository.search([], { order: 'id' })
    expect(restored.map(({ id, category, name }) => ({ id, category, name })))
      .toEqual(members.map(({ id, category, name }) => ({ id, category, name })))
    expect(await repository.find('missing')).toBeNull()
  })

  it('allows removal when the remaining records satisfy the logical boundary', async () => {
    const repository = new Repository({ model: GroupBoundary, ...options })
    await repository.add(repository.create([
      { id: 'G001', category: 'team', name: 'First member' },
      { id: 'G002', category: 'team', name: 'Second member' },
      { id: 'G003', category: 'team', name: 'Third member' }
    ]))

    await expect(repository.remove({ id: 'G001' })).resolves.toMatchObject({
      id: 'G001', name: 'First member'
    })

    expect(await repository.find('G001')).toBeNull()
    expect(await repository.search([], { order: 'id' })).toMatchObject([
      { id: 'G002', category: 'team', name: 'Second member' },
      { id: 'G003', category: 'team', name: 'Third member' }
    ])
  })
})

class Project extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.name = attributes.name || ''
  }

  static rejections = [{
    operation: 'remove',
    message: 'Remove the project tasks before deleting the project.',
    expression: [
      '$select', [':id'],
      ['$where', ['$in', ':projectId', ['_map', 'id', '#items']],
        ['$from', ['$as', 'Task', '@Task']]]
    ]
  }, {
    operation: 'remove',
    message: 'Remove the project milestones before deleting the project.',
    expression: [
      '$select', [':id'],
      ['$where', ['$in', ':projectId', ['_map', 'id', '#items']],
        ['$from', ['$as', 'Milestone', '@Milestone']]]
    ]
  }]
}

class Task extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.projectId = attributes.projectId || ''
    this.title = attributes.title || ''
  }

  static rejections = [{
    operation: 'add',
    message: 'Archived projects cannot receive tasks.',
    expression: [
      '$select', [':id'],
      ['$where', ['$and',
        ['$in', ':id', ['_map', 'projectId', '#items']],
        ['=', ':status', 'archived']],
      ['$from', ['$as', 'Project', '@Project']]]
    ]
  }, {
    operation: 'remove',
    message: 'Completed tasks must be retained.',
    condition: ['$and',
      ['$in', ':id', ['_map', 'id', '#items']],
      ['=', ':status', 'completed']]
  }]
}

class Milestone extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.projectId = attributes.projectId || ''
    this.title = attributes.title || ''
  }
}

describe.each([
  ['memory', MemoryRepository],
  ['JSON', JsonRepository]
])('Portal usage examples with %s storage', (_name, Repository) => {
  let portal, projects, tasks, milestones, directory

  beforeEach(async () => {
    let storage = {}
    if (Repository === JsonRepository) {
      directory = await fs.mkdtemp(path.join(tmpdir(), 'modelark-portal-examples-'))
      storage = { directory, fs, path }
    }
    projects = new Repository({ model: Project, ...storage })
    tasks = new Repository({ model: Task, ...storage })
    milestones = new Repository({ model: Milestone, ...storage })
    portal = new Portal({ repositories: [projects, tasks, milestones] })
  })

  afterEach(async () => {
    if (directory) await fs.rm(directory, { recursive: true, force: true })
    directory = null
  })

  it.each([
    ['tasks', Task, 'Remove the project tasks before deleting the project.'],
    ['milestones', Milestone, 'Remove the project milestones before deleting the project.']
  ])('blocks project removal when only %s reference it', async (_name, Model, message) => {
    const [project, unrelated] = await portal.add([
      new Project({ id: 'P001', name: 'Target project' }),
      new Project({ id: 'P002', name: 'Unrelated project' })
    ])
    const child = await portal.add(new Model({ id: 'C001', projectId: project.id }))
    await portal.add(new Task({ id: 'T002', projectId: unrelated.id }))
    await portal.add(new Milestone({ id: 'M002', projectId: unrelated.id }))
    const before = await Promise.all([
      projects.search(), tasks.search(), milestones.search()
    ])

    await expect(portal.remove(new Project({ id: project.id }))).rejects.toThrow(message)

    expect(await Promise.all([
      projects.search(), tasks.search(), milestones.search()
    ])).toEqual(before)

    await portal.remove(child)
    await expect(portal.remove(project)).resolves.toMatchObject({ id: project.id })
    expect(await projects.find(project.id)).toBeNull()
    expect(await projects.find(unrelated.id)).toMatchObject({ name: 'Unrelated project' })
    expect(await tasks.find('T002')).toMatchObject({ projectId: unrelated.id })
    expect(await milestones.find('M002')).toMatchObject({ projectId: unrelated.id })
  })

  it('requires clearing both child models before removing a project', async () => {
    const project = await portal.add(new Project({ id: 'P001', name: 'Release' }))
    const task = await portal.add(new Task({ id: 'T001', projectId: project.id }))
    const milestone = await portal.add(new Milestone({ id: 'M001', projectId: project.id }))
    const before = await projects.find(project.id)

    await expect(portal.remove(project)).rejects.toThrow(
      'Remove the project tasks before deleting the project.')
    expect(await projects.find(project.id)).toEqual(before)
    expect(await tasks.find(task.id)).toMatchObject({ projectId: project.id })
    expect(await milestones.find(milestone.id)).toMatchObject({ projectId: project.id })

    await portal.remove(task)

    await expect(portal.remove(project)).rejects.toThrow(
      'Remove the project milestones before deleting the project.')
    expect(await projects.find(project.id)).toEqual(before)
    expect(await tasks.find(task.id)).toBeNull()
    expect(await milestones.find(milestone.id)).toMatchObject({ projectId: project.id })

    await portal.remove(milestone)

    await expect(portal.remove(project)).resolves.toMatchObject({ id: project.id })
    expect(await projects.search()).toEqual([])
    expect(await tasks.search()).toEqual([])
    expect(await milestones.search()).toEqual([])
  })

  it('keeps an entire project batch until both child models release every member', async () => {
    const [withTask, withMilestone, unreferenced] = await portal.add([
      new Project({ id: 'P001', name: 'With task' }),
      new Project({ id: 'P002', name: 'With milestone' }),
      new Project({ id: 'P003', name: 'Without children' })
    ])
    const task = await portal.add(new Task({ id: 'T001', projectId: withTask.id }))
    const milestone = await portal.add(new Milestone({
      id: 'M001', projectId: withMilestone.id
    }))
    const batch = [unreferenced, withTask, withMilestone]
    const before = await projects.search()

    await expect(portal.remove(batch)).rejects.toThrow(
      'Remove the project tasks before deleting the project.')
    expect(await projects.search()).toEqual(before)
    expect(await tasks.find(task.id)).toMatchObject({ projectId: withTask.id })
    expect(await milestones.find(milestone.id)).toMatchObject({ projectId: withMilestone.id })

    await portal.remove(task)

    await expect(portal.remove(batch)).rejects.toThrow(
      'Remove the project milestones before deleting the project.')
    expect(await projects.search()).toEqual(before)
    expect(await milestones.find(milestone.id)).toMatchObject({ projectId: withMilestone.id })

    await portal.remove(milestone)
    const removed = await portal.remove(batch)

    expect(removed.map(item => item.id)).toEqual(['P003', 'P001', 'P002'])
    expect(await projects.search()).toEqual([])
    expect(await tasks.search()).toEqual([])
    expect(await milestones.search()).toEqual([])
  })

  it('adds tasks to active projects and removes a project only after its tasks', async () => {
    const [active, archived] = await portal.add([
      new Project({ id: 'P001', name: 'Release', status: 'active' }),
      new Project({ id: 'P002', name: 'Previous release', status: 'archived' })
    ])

    await expect(portal.add(new Task({
      id: 'T001', projectId: archived.id, title: 'New work'
    }))).rejects.toThrow('Archived projects cannot receive tasks.')
    expect(await tasks.find('T001')).toBeNull()

    const task = await portal.add(new Task({
      id: 'T002', projectId: active.id, title: 'Publish release notes'
    }))
    expect(task).toBeInstanceOf(Task)
    expect(await tasks.find(task.id)).toMatchObject({ projectId: active.id })

    await expect(portal.remove(active)).rejects.toThrow(
      'Remove the project tasks before deleting the project.')
    expect(await projects.find(active.id)).toMatchObject({ name: 'Release' })
    expect(await tasks.find(task.id)).toMatchObject({ title: 'Publish release notes' })

    await expect(portal.remove(task)).resolves.toMatchObject({ id: task.id })
    await expect(portal.remove(active)).resolves.toMatchObject({ id: active.id })
    expect(await tasks.find(task.id)).toBeNull()
    expect(await projects.find(active.id)).toBeNull()
    expect(await projects.find(archived.id)).toMatchObject({ status: 'archived' })
  })

  it('rejects a whole task batch when one task targets an archived project', async () => {
    const [active, archived] = await portal.add([
      new Project({ id: 'P001', status: 'active' }),
      new Project({ id: 'P002', status: 'archived' })
    ])
    const first = new Task({ id: 'T001', projectId: active.id, title: 'First task' })
    const blocked = new Task({ id: 'T002', projectId: archived.id, title: 'Blocked task' })

    await expect(portal.add([first, blocked])).rejects.toThrow(
      'Archived projects cannot receive tasks.')
    expect(await tasks.search()).toEqual([])

    const second = new Task({ id: 'T003', projectId: active.id, title: 'Second task' })
    const added = await portal.add([first, second])

    expect(added.every(item => item instanceof Task)).toBe(true)
    expect(added.map(item => item.id)).toEqual(['T001', 'T003'])
    expect(await tasks.find(['T001', 'T003'])).toMatchObject([
      { title: 'First task' }, { title: 'Second task' }
    ])
    expect(await tasks.find(blocked.id)).toBeNull()
  })

  it('keeps an entire project batch until every project is free of tasks', async () => {
    const [referenced, unreferenced] = await portal.add([
      new Project({ id: 'P001', name: 'With tasks' }),
      new Project({ id: 'P002', name: 'Without tasks' })
    ])
    const task = await portal.add(new Task({ id: 'T001', projectId: referenced.id }))
    const before = await projects.search()

    await expect(portal.remove([unreferenced, referenced])).rejects.toThrow(
      'Remove the project tasks before deleting the project.')
    expect(await projects.search()).toEqual(before)
    expect(await tasks.find(task.id)).toMatchObject({ projectId: referenced.id })

    await portal.remove([task])
    const removed = await portal.remove([unreferenced, referenced])

    expect(removed.every(item => item instanceof Project)).toBe(true)
    expect(removed.map(item => item.id)).toEqual(['P002', 'P001'])
    expect(await projects.search()).toEqual([])
    expect(await tasks.search()).toEqual([])
  })

  it('uses stored task status when removing an id-only or stale model instance', async () => {
    const project = await portal.add(new Project({ id: 'P001', status: 'active' }))
    const [completed, pending] = await portal.add([
      new Task({ id: 'T001', projectId: project.id, status: 'completed' }),
      new Task({ id: 'T002', projectId: project.id, status: 'pending' })
    ])

    await expect(portal.remove(new Task({ id: completed.id }))).rejects.toThrow(
      'Completed tasks must be retained.')
    await expect(portal.remove(new Task({
      id: completed.id, status: 'pending'
    }))).rejects.toThrow('Completed tasks must be retained.')
    expect(await tasks.find(completed.id)).toMatchObject({ status: 'completed' })

    await expect(portal.remove(new Task({ id: pending.id }))).resolves.toMatchObject({
      id: pending.id, status: 'pending'
    })
    expect(await tasks.find(pending.id)).toBeNull()
  })
})
