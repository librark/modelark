import { describe, expect, it, beforeEach } from '@jest/globals'
import { Entity } from '../../lib/core/entity/index.js'
import { MemoryRepository } from './memory.repository.js'
import { Portal } from './portal.js'

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
