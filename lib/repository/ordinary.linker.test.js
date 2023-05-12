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
      '$join', ['$as', 'Beta', '@Beta'],
      ['=', 'Alpha:id', 'Beta:alphaId'],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]
    const result = await linker.query(expression)

    expect(result).toMatchObject([
      {
        Alpha: { id: 'A001', name: 'John Doe' },
        Beta: { id: 'B001', alphaId: 'A001' }
      },
      {
        Alpha: { id: 'A001', name: 'John Doe' },
        Beta: { id: 'B002', alphaId: 'A001' }
      },
      {
        Alpha: { id: 'A003', name: 'Ronald Roe' },
        Beta: { id: 'B003', alphaId: 'A003' }
      },
      {
        Alpha: { id: 'A003', name: 'Ronald Roe' },
        Beta: { id: 'B004', alphaId: 'A003' }
      },
      {
        Alpha: { id: 'A002', name: 'Donald Duck' },
        Beta: { id: 'B005', alphaId: 'A002' }
      }
    ])
  })
})
