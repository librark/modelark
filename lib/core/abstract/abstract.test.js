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

  it('provides a utilitarian method named "abstract" which throws', () => {
    class CustomAbstract extends Abstract {
      customMethod (first, second) {
        this.abstract({ first, second })
      }

      emptyMethod () {
        this.abstract()
      }
    }
    class Concrete extends CustomAbstract {}

    const concrete = new Concrete()

    expect(() => concrete.customMethod(1, 2)).toThrow(
      'Abstract method. "Concrete.customMethod(first, second)" ' +
      'has not been implemented.')
    expect(() => concrete.emptyMethod()).toThrow(
      'Abstract method. "Concrete.emptyMethod()" ' +
      'has not been implemented.')
  })

  it('has an "abstract" method printing the return type given', () => {
    class CustomAbstract extends Abstract {
      customMethod (first, second) {
        this.abstract({ first, second }, Number)
      }

      emptyMethod () {
        this.abstract()
      }

      arrayMethod (first, second) {
        this.abstract([['first', first], ['second', second]], Number)
      }
    }
    class Concrete extends CustomAbstract {}

    const concrete = new Concrete()

    expect(() => concrete.customMethod(1, 2)).toThrow(
      'Abstract method. ' +
      '"Concrete.customMethod(first, second) : Number" ' +
      'has not been implemented.')
    expect(() => concrete.emptyMethod()).toThrow(
      'Abstract method. "Concrete.emptyMethod()" ' +
      'has not been implemented.')
    expect(() => concrete.arrayMethod(1, 2)).toThrow(
      'Abstract method. ' +
      '"Concrete.arrayMethod(first, second) : Number" ' +
      'has not been implemented.')
  })
})
