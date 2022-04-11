import { describe, expect, it, beforeEach } from '@jest/globals'
import {
  Filterer, DefaultLocator, JsonStorer
} from '../../lib/common'
import { JsonRepository } from '../../lib/repository'

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
    expect(repository.locator instanceof DefaultLocator).toBe(true)
    expect(repository.filterer instanceof Filterer).toBe(true)
    expect(repository.storer instanceof JsonStorer).toBe(true)
  })

  it('is defined with custom location and store arguments', function () {
    const repository = new JsonRepository({
      directory: '/tmp/custom/directory',
      collection: 'elements',
      reference: 'editor',
      location: 'namespace'
    })
    expect(repository.locator.location()).toBe('namespace')
    expect(repository.locator.reference()).toBe('editor')
    expect(repository.storer.directory).toBe('/tmp/custom/directory')
    expect(repository.storer.collection).toBe('elements')
  })
})
