import { describe, expect, it, beforeEach } from '@jest/globals'
import { ViewInterface } from '../../lib/view/interface.js'

describe('ViewInterface', () => {
  let viewInterface = null
  beforeEach(function () {
    viewInterface = new ViewInterface()
  })

  it('is defined', () => {
    expect(viewInterface).toBeTruthy()
  })

  it('defines a "query" method', async () => {
    try {
      const parameters = {}
      await viewInterface.query(parameters)
    } catch (error) {
      expect(error.message).toBe('Not implemented')
    }
  })
})
