import { describe, expect, it, beforeEach } from '@jest/globals'
import {
  DataParser, DefaultLocator, JsonStorer, Entity
} from '../../lib/core/index.js'
import { JsonRepository } from './json.repository.js'

describe('JsonRepository', () => {
  let repository = null

  beforeEach(function () {
    repository = new JsonRepository()
  })

  it('is defined', function () {
    expect(repository).toBeTruthy()
  })

  it('is defined with default values', function () {
    const repository = new JsonRepository()
    expect(repository.model).toBe(Entity)
    expect(repository.locator instanceof DefaultLocator).toBe(true)
    expect(repository.parser instanceof DataParser).toBe(true)
    expect(repository.storer instanceof JsonStorer).toBe(true)
  })

  it('is defined with custom location and store arguments', function () {
    class CustomEntity extends Entity {}
    const locator = new DefaultLocator(
      { reference: 'editor', location: 'namespace' })
    const repository = new JsonRepository({
      model: CustomEntity,
      locator,
      directory: '/tmp/custom/directory'
    })
    expect(repository.model).toBe(CustomEntity)
    expect(repository.locator.location()).toBe('namespace')
    expect(repository.locator.reference()).toBe('editor')
    expect(repository.storer.directory).toBe('/tmp/custom/directory')
    expect(repository.storer.collection).toBe('CustomEntity')
  })
})
