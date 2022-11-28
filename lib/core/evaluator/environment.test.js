import { describe, expect, it } from '@jest/globals'
import { Environment, standardOperators } from './environment.js'

describe('Environment', () => {
  it('defines a set of standard operators', () => {
    expect(standardOperators).toBeTruthy()
  })

  it('creates an environment with default operators', () => {
    const environment = new Environment()
    expect(environment).toBeTruthy()
    expect(environment.$time()).toBeGreaterThan(0)
  })

  it('creates an environment given a context', () => {
    const environment = new Environment({ $function: (...args) => args })
    expect(environment).toBeTruthy()
    expect(environment.$function(1, 2, 3)).toEqual([1, 2, 3])
  })
})
