import { describe, expect, it, beforeEach } from '@jest/globals'
import { Locator, DefaultLocator } from './locator.js'

describe('Locator', () => {
  let locator = null
  beforeEach(function () {
    locator = new Locator()
  })

  it('can be instantiated', () => {
    expect(locator).toBeTruthy()
  })

  it('defines a "reference" method', () => {
    expect(() => locator.reference()).toThrow('Not implemented')
  })

  it('defines a "location" method', () => {
    expect(() => locator.location()).toThrow('Not implemented')
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
