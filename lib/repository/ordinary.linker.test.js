import { describe, expect, it, beforeEach } from '@jest/globals'
import { Entity } from '../core/index.js'
import { MemoryRepository } from './memory.repository.js'
import { OrdinaryLinker } from './ordinary.linker.js'

describe('OrdinaryLinker', () => {
  class Alpha extends Entity {
    constructor (attributes = {}) {
      super(attributes)
      this.name = attributes.name || ''
    }
  }
  class Beta extends Entity {
    constructor (attributes = {}) {
      super(attributes)
      this.name = attributes.name || ''
      this.alphaId = attributes.alphaId || null
    }
  }

  let linker = null

  beforeEach(async () => {
    const alphaRepository = new MemoryRepository({ model: new Alpha() })
    alphaRepository.load([
      { id: 'A001', name: 'John Doe' },
      { id: 'A002', name: 'Donald Duck' },
      { id: 'A003', name: 'Ronald Roe' }
    ])
    const betaRepository = new MemoryRepository({ model: new Beta() })
    betaRepository.load([
      { id: 'B001', alphaId: 'A001' },
      { id: 'B002', alphaId: 'A001' },
      { id: 'B003', alphaId: 'A003' },
      { id: 'B004', alphaId: 'A003' },
      { id: 'B005', alphaId: 'A002' }
    ])

    linker = new OrdinaryLinker().setup([alphaRepository, betaRepository])
  })

  it('can be instantiated', () => {
    expect(linker).toBeTruthy()
  })

  it('queries its repositories using symbolic expressions', async () => {
    const expression = [
      '$select', ['Alpha:name', 'Beta:alphaId'],
      ['$join', ['$as', 'Beta', '@Beta'],
        ['=', 'Alpha:id', 'Beta:alphaId'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const result = await linker.query(expression)

    expect(result).toMatchObject({
      fields: ['Alphaname', 'BetaalphaId'],
      rows: [
        { Alphaname: 'John Doe', BetaalphaId: 'A001' },
        { Alphaname: 'John Doe', BetaalphaId: 'A001' },
        { Alphaname: 'Ronald Roe', BetaalphaId: 'A003' },
        { Alphaname: 'Ronald Roe', BetaalphaId: 'A003' },
        { Alphaname: 'Donald Duck', BetaalphaId: 'A002' }
      ]
    })
  })

  it('queries its repositories using optional context', async () => {
    const expression = [
      '$select', ['Alpha:name', 'Beta:alphaId'],
      ['$join', ['$as', 'Beta', '@Beta'],
        ['$and',
          ['=', 'Alpha:id', 'Beta:alphaId'],
          ['=', 'Alpha:id', '#user.id']],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const context = { '#': { user: { id: 'A001' } } }
    const result = await linker.query(expression, context)

    expect(result).toMatchObject({
      fields: ['Alphaname', 'BetaalphaId'],
      rows: [
        { Alphaname: 'John Doe', BetaalphaId: 'A001' },
        { Alphaname: 'John Doe', BetaalphaId: 'A001' }
      ]
    })
  })

  it('returns an array of arrays upon that mode', async () => {
    const expression = [
      '$select', ['Alpha:name', 'Beta:alphaId'],
      ['$join', ['$as', 'Beta', '@Beta'],
        ['=', 'Alpha:id', 'Beta:alphaId'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const result = await linker.query(expression, { mode: 'array' })

    expect(result).toMatchObject({
      fields: ['Alphaname', 'BetaalphaId'],
      rows: [
        ['John Doe', 'A001'],
        ['John Doe', 'A001'],
        ['Ronald Roe', 'A003'],
        ['Ronald Roe', 'A003'],
        ['Donald Duck', 'A002']
      ]
    })
  })
})
