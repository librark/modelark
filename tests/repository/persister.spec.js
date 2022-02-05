import { describe, expect, it, beforeEach } from '@jest/globals'
import { Entity } from '../../lib/common/entity.js'
import { Persister, MemoryRepository } from '../../lib/repository'

class Alpha extends Entity {}

class Beta extends Entity {}

describe('Persister', () => {
  let persister = null

  beforeEach(function () {
    const alphaRepository = new MemoryRepository({ model: Alpha })
    persister = new Persister({
      repositories: [alphaRepository]
    })
  })

  it('is defined', function () {
    expect(persister).toBeTruthy()
  })

  it('gets the repository associated to the given model', () => {
    const repository = persister.get(Alpha)

    expect(repository.model).toBe(Alpha)
  })

  it('sets the repository associated to the given model', () => {
    const betaRepository = new MemoryRepository({ model: Beta })

    persister.put(betaRepository)

    const repository = persister.get(Beta)
    expect(repository.model).toBe(Beta)
    expect(repository).toBe(betaRepository)
  })
})
