import { describe, expect, it, beforeEach } from '@jest/globals'
import { Locator, DefaultLocator } from '../../lib/common'

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

describe('DefaultLocator', () => {
  let locator = null
  beforeEach(function () {
    locator = new DefaultLocator()
  })

  it('can be instantiated', () => {
    expect(locator).toBeTruthy()
  })

  it('defines a "reference" method', () => {
    expect(locator.reference()).toBe('default')
  })

  it('defines a "location" method', () => {
    expect(locator.location()).toBe('default')
  })
})
