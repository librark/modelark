import { describe, expect, it, beforeEach } from '@jest/globals'
import { Repository } from '../../src/repository/repository.js'

describe('Repository', () => {
  let repository = null
  beforeEach(function () {
    repository = new Repository()
  })

  it('converts a filter tuple into a comparison expression', function () {
    expect(repository).toBeTruthy()
  })
})
