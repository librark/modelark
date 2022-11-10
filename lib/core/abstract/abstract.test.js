import { describe, expect, it } from '@jest/globals'
import { Abstract } from './abstract.js'

describe('Abstract', () => {
  it('throws if tried to be instantiated directly', () => {
    expect(() => new Abstract()).toThrow(
      'The "Abstract" class should be extended by custom abstract classes.')
  })

  it('throws if one of its direct subclasses is instantiated', () => {
    class CustomAbstract extends Abstract {}

    expect(() => new CustomAbstract()).toThrow(
      'Abstract class "CustomAbstract" should be ' +
      'implemented by concrete classes.')
  })

  it('allows its concrete subclasses to be instantiated', () => {
    class CustomAbstract extends Abstract {}
    class Concrete extends CustomAbstract {}

    const concrete = new Concrete()

    expect(concrete).toBeTruthy()
  })
})
