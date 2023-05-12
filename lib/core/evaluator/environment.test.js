import { describe, expect, it } from '@jest/globals'
import { Environment } from './environment.js'

describe('Environment', () => {
  it('creates an environment given a context', () => {
    const environment = new Environment({ $function: (...args) => args })
    expect(environment).toBeTruthy()
    expect(environment.$function(1, 2, 3)).toEqual([1, 2, 3])
  })
})
