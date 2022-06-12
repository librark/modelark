import { describe, expect, it, beforeEach } from '@jest/globals'
import { SqlFilterer } from '../../../lib/common/filterer/index.js'

describe('Fiterer', () => {
  let filterer = null

  beforeEach(() => {
    filterer = new SqlFilterer()
  })

  it('can be instantiated', () => {
    expect(filterer).toBeTruthy()
  })

  it('parses domain tuples', () => {
    const tuples = [
      [['field', '=', 99], ['field = $1', 99]],
      [['field', 'like', 'world'], ['field LIKE $1', 'world']],
      [['field', 'ilike', 'world'], ['field ILIKE $1', 'world']],
      [['field', 'contains', 99], ['$1 = ANY(field)', 99]]
    ]

    for (const [tuple, expected] of tuples) {
      const result = filterer._parseTuple(tuple)
      expect(result).toEqual(expected)
    }
  })

  it('parses single terms', () => {
    const domain = [['field', '=', 7]]
    const expected = ['field = $1', [7]]

    const result = filterer.parse(domain)

    expect(result).toEqual(expected)
  })

  it('parses with default joins', () => {
    const stack = ['field2 <> $2', 'field = $1']
    const expected = ['field = $1 AND field2 <> $2']
    const result = filterer._defaultJoin(stack)
    expect(result).toEqual(expected)
  })

  it('parses multiple terms', () => {
    const testDomains = [
      [[['field', '=', 7], ['field2', '!=', 8]],
        ['field = $1 AND field2 <> $2', [7, 8]]],
      [[['field', '=', 7], ['field2', '!=', 8], ['field3', '>=', 9]],
        ['field = $1 AND field2 <> $2 AND field3 >= $3', [7, 8, 9]]],
      [['|', ['field', '=', 7], ['field2', '!=', 8], ['field3', '>=', 9]],
        ['field = $1 OR field2 <> $2 AND field3 >= $3', [7, 8, 9]]],
      [['|', ['field', '<', 7], '!', ['field2', '!=', 8], ['field3', '>=', 9]],
        ['field < $1 OR NOT field2 <> $2 AND field3 >= $3', [7, 8, 9]]],
      [['!', ['field', '=', 7]], ['NOT field = $1', [7]]],
      [[['field', '>', 7]], ['field > $1', [7]]],
      [[['field', '>=', 7], ['field2', '<=', 8]],
        ['field >= $1 AND field2 <= $2', [7, 8]]],
      [[['field', 'in', [1, 2, 3]]], ['field = ANY($1)', [[1, 2, 3]]]]
    ]

    for (const domain of testDomains) {
      const result = filterer.parse(domain[0])
      const expected = domain[1]
      expect(result).toEqual(expected)
    }
  })
})
