import { describe, expect, it, beforeEach } from '@jest/globals'
import { Registry } from './registry.js'

class Alpha {}
class Beta {}
class Gamma {}

describe('Registry', () => {
  let registry = null

  beforeEach(function () {
    registry = new Registry()
  })

  it('is defined', function () {
    expect(registry).toBeTruthy()
  })

  it('can set and get resources', () => {
    registry.set([
      new Alpha(),
      new Beta(),
      new Gamma()
    ])

    expect(registry.get('Alpha')).toBeInstanceOf(Alpha)
    expect(registry.get('Beta')).toBeInstanceOf(Beta)
    expect(registry.get('Gamma')).toBeInstanceOf(Gamma)
  })

  it('throws an error if the resource is not found', () => {
    registry = new Registry()

    expect(() => registry.get('Alpha')).toThrow(
      "Resource 'Alpha' has not been provided.")
  })
})
