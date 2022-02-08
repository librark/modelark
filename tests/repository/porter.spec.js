import { describe, expect, it, beforeEach } from '@jest/globals'
import { Entity } from '../../lib/common/entity.js'
import { Porter, MemoryRepository } from '../../lib/repository'

class Alpha extends Entity {}

class Beta extends Entity {}

describe('Porter', () => {
  let porter = null

  beforeEach(function () {
    const alphaRepository = new MemoryRepository({ model: Alpha })
    porter = new Porter({
      repositories: [alphaRepository]
    })
  })

  it('is defined', function () {
    expect(porter).toBeTruthy()
  })

  it('can be instantiated without respositories', () => {
    porter = new Porter()

    expect(porter).toBeTruthy()
    expect(() => porter.get('Alpha')).toThrow(
      "A repository for 'Alpha' has not been provided.")
  })

  it('gets the repository associated to the given model', () => {
    const repository = porter.get('Alpha')

    expect(repository.model).toBe(Alpha)
  })

  it('sets the repository associated to the given model', () => {
    const betaRepository = new MemoryRepository({ model: Beta })

    porter.put(betaRepository)

    const repository = porter.get('Beta')
    expect(repository.model).toBe(Beta)
    expect(repository).toBe(betaRepository)
  })
})
