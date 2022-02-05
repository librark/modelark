import { describe, expect, it, beforeEach } from '@jest/globals'
import {
  Filterer, DefaultLocator, JsonStorer
} from '../../lib/common'
import { JsonRepository } from '../../lib/repository'

describe('JsonRepository', () => {
  let repository = null
  const mockTimestamp = 1640446104

  beforeEach(function () {
    const mockDate = { now: () => mockTimestamp * 1000 }
    repository = new JsonRepository({ clock: mockDate })
  })

  it('is defined', function () {
    expect(repository).toBeTruthy()
  })

  it('is defined with default values', function () {
    const repository = new JsonRepository()
    expect(repository.locator instanceof DefaultLocator).toBe(true)
    expect(repository.filterer instanceof Filterer).toBe(true)
    expect(repository.storer instanceof JsonStorer).toBe(true)
    expect(repository.clock).toBe(Date)
  })
})
