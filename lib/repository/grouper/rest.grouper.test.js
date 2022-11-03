import { describe, expect, it, beforeEach } from '@jest/globals'
import { RestRepository } from '../rest.repository.js'
import { RestGrouper } from './rest.grouper.js'

describe('RestGrouper', () => {
  let grouper = null
  let repository = null

  beforeEach(() => {
    repository = new RestRepository()
    grouper = new RestGrouper({ repository })
  })

  it('can be instantiated', () => {
    expect(grouper).toBeTruthy()
  })
})
