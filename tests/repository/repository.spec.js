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

  it('finds entities based on a list of scalars', async () => {
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
})
