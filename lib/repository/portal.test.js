import { describe, expect, it, beforeEach } from '@jest/globals'
import { Entity } from '../../lib/core/entity/index.js'
import { MemoryRepository } from './memory.repository.js'
import { Portal } from './portal.js'

class Alpha extends Entity {
  constructor(attributes = {}) {
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

    const items = await portal.join([Alpha, Delta, Beta])

    expect(items).toMatchObject([
      [{ id: 'A001' }, [
        [{ id: 'D001', alphaId: 'A001', betaId: 'B001' }, { id: 'B001' }],
        [{ id: 'D002', alphaId: 'A001', betaId: 'B002' }, { id: 'B002' }],
      ]],
      [{ id: 'A002' }, [
        [{ id: 'D003', alphaId: 'A002', betaId: 'B001' }, { id: 'B001' }],
      ]],
      [{ id: 'A003' }, [
        [{ id: 'D004', alphaId: 'A003', betaId: 'B003' }, { id: 'B003' }],
      ]],
      [{ id: 'A004' }, []],
    ])
  })
})
