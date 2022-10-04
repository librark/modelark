import { describe, expect, it, beforeEach } from '@jest/globals'
import { Query } from './query.js'

describe('Query', () => {
  let query = null
  beforeEach(function () {
    query = new Query()
  })

  it('is defined', () => {
    expect(query).toBeTruthy()
  })
})
