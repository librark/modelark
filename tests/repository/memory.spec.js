import { describe, expect, it, beforeEach } from '@jest/globals'
import { MemoryRepository } from '../../src/repository'

describe('MemoryRepository', () => {
  let repository = null

  beforeEach(function () {
    repository = new MemoryRepository()
  })

  it('is defined', function () {
    expect(repository).toBeTruthy()
  })
})
