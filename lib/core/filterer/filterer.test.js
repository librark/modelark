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

  it('compares time and date fields', () => {
    const expression = ['<', ':createdAt', '2022-11-28']
    const object = { createdAt: new Date('2022-11-27T02:29:48Z') }

    const filter = filterer.parse(expression)
    const result = filter(object)

    expect(result).toBe(true)
  })

  it('can extend its base context with an additional one', () => {
    const object = { id: 'I001' }
    const items = [
      { id: 'I001', name: 'alpha' },
      { id: 'I002', name: 'beta' },
      { id: 'I003', name: 'gamma' }
    ]
    const expression = ['$in', ':id', ['$map', '@items', 'id']]

    const filter = filterer.parse(expression, { items })
    const result = filter(object)

    expect(result).toBe(true)
  })
})
