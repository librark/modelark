import { describe, expect, it, beforeEach } from '@jest/globals'
import { Locator } from '../../src/common/locator.js'

describe('Locator', () => {
  let locator = null
  beforeEach(function () {
    locator = new Locator()
  })

  it('can be instantiated', () => {
    expect(locator).toBeTruthy()
  })

  it('defines a "reference" method', () => {
    try {
      locator.reference()
    } catch (error) {
      expect(error.message).toBe('Not implemented')
    }
  })

  it('defines a "location" method', () => {
    try {
      locator.location()
    } catch (error) {
      expect(error.message).toBe('Not implemented')
    }
  })
})
