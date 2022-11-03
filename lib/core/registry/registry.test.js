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

  it('can map resources to an specific name', () => {
    registry.map({
      first: new Alpha(),
      second: new Beta(),
      third: new Gamma()
    })

    expect(registry.get('first')).toBeInstanceOf(Alpha)
    expect(registry.get('second')).toBeInstanceOf(Beta)
    expect(registry.get('third')).toBeInstanceOf(Gamma)
  })

  it('gets an instance by resolving its name from several objects', () => {
    const instance = new Alpha()

    registry.set(instance)

    expect(registry.get('Alpha')).toBeInstanceOf(Alpha)
    expect(registry.get('Alpha')).toBe(instance)
    expect(registry.get(Alpha)).toBeInstanceOf(Alpha)
    expect(registry.get(Alpha)).toBe(instance)
    expect(registry.get(new Alpha())).toBeInstanceOf(Alpha)
    expect(registry.get(new Alpha())).toBe(instance)
    expect(registry.get({ name: 'Alpha' })).toBeInstanceOf(Alpha)
    expect(registry.get({ name: 'Alpha' })).toBe(instance)
  })

  it('throws an error if the resource is not found', () => {
    registry = new Registry()

    expect(() => registry.get('Alpha')).toThrow(
      "Resource 'Alpha' was not found in the registry.")
  })

  it('can be initialized with a mapping or array', () => {
    let registry = new Registry({
      resources: {
        first: new Alpha(),
        second: new Beta(),
        third: new Gamma()
      }
    })

    expect(registry.get('first')).toBeInstanceOf(Alpha)
    expect(registry.get('second')).toBeInstanceOf(Beta)
    expect(registry.get('third')).toBeInstanceOf(Gamma)

    registry = new Registry({
      resources: [
        new Alpha(),
        new Beta(),
        new Gamma()
      ]
    })

    expect(registry.get('Alpha')).toBeInstanceOf(Alpha)
    expect(registry.get('Beta')).toBeInstanceOf(Beta)
    expect(registry.get('Gamma')).toBeInstanceOf(Gamma)
  })
})
