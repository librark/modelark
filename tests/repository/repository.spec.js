import { describe, expect, it, beforeEach } from '@jest/globals'
import { Repository } from '../../lib/repository'

describe('Repository', () => {
  let repository = null

  beforeEach(function () {
    repository = new Repository()
  })

  it('is defined', function () {
    expect(repository).toBeTruthy()
  })
})
