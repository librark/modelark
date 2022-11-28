import { describe, expect, it, beforeEach } from '@jest/globals'
import { Filterer } from './filterer.js'

describe('Fiterer', () => {
  let filterer = null
  beforeEach(() => {
    filterer = new Filterer()
  })

  it('converts a filter tuple into a comparison expression', () => {
    const testTuples = [
      [['=', ':field', 99], { field: 99 }, true],
      [['!=', ':field', 99], { field: 99 }, false],
      [['>', ':field', 99], { field: 99 }, false],
      [['<', ':field', 99], { field: 99 }, false],
      [['>=', ':field', 99], { field: 99 }, true],
      [['<=', ':field', 99], { field: 99 }, true]
    ]

    for (const testTuple of testTuples) {
      const [expression, object, expectation] = testTuple

      const filter = filterer.parse(expression)

      const result = filter(object)

      expect(result).toEqual(expectation)
    }
  })
})
