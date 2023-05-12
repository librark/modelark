import { describe, expect, it, beforeEach } from '@jest/globals'
import { Entity } from '../../lib/core/entity/index.js'
import { MemoryRepository } from './memory.repository.js'
import { Portal } from './portal.js'

class Alpha extends Entity {}

class Beta extends Entity {}

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

    expect(repository.model.constructor).toBe(Alpha)
  })

  it('sets the repository associated to the given model', () => {
    const betaRepository = new MemoryRepository({ model: new Beta() })

    portal.set(betaRepository)

    const repository = portal.get('Beta')
    expect(repository.model.constructor).toBe(Beta)
    expect(repository).toBe(betaRepository)
  })

  it('queries its repositories using symbolic expressions', async () => {
    const result = await portal.query([
      '$select', ['*'],
      ['$from', ['$as', 'Alpha', '@Alpha']]])

    expect(result).toEqual([])
  })
})
