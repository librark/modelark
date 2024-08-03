import { describe, expect, it, beforeEach } from '@jest/globals'
import { SqlFilterer } from './sql.filterer.js'

describe('SqlFilterer', () => {
  let filterer = null

  beforeEach(() => {
    filterer = new SqlFilterer()
  })

  it('can be instantiated', () => {
    expect(filterer).toBeTruthy()
  })

  it('parses condition tuples', async () => {
    const tuples = [
      [['=', ':field', 99], ['"field" = $1', [99]]],
      [['$like', ':field', 'world'], ['"field" LIKE $1', ['world']]],
      [['$ilike', ':field', 'world'], ['"field" ILIKE $1', ['world']]]
    ]

    for (const [tuple, expected] of tuples) {
      const filter = filterer.parse(tuple)
      const result = await filter()
      expect(result).toEqual(expected)
    }
  })

  it('parses single terms', async () => {
    const expression = ['=', ':field', 7]
    const expected = ['"field" = $1', [7]]

    const filter = filterer.parse(expression)
    const result = await filter()

    expect(result).toEqual(expected)
  })

  it('parses single terms with multiple values', async () => {
    const expression = ['=', ':field', 7, ':column']
    const expected = ['"field" = $1 AND "column" = $2', [7, 7]]

    const filter = filterer.parse(expression)
    const result = await filter()

    expect(result).toEqual(expected)
  })

  it('parses "in" statements', async () => {
    const expression = ['$in', ':field', 7, 8, 9]
    const expected = ['"field" = ANY($1)', [[7, 8, 9]]]

    const filter = filterer.parse(expression)
    const result = await filter()

    expect(result).toEqual(expected)
  })

  it('parses "in" statements with quoted lists', async () => {
    const expression = ['$in', ':field', { '': [7, 8, 9] }]
    const expected = ['"field" = ANY($1)', [[7, 8, 9]]]

    const filter = filterer.parse(expression)
    const result = await filter()

    expect(result).toEqual(expected)
  })

  it('parses "contains" statements', async () => {
    const expression = ['$contains', ':field', 7, 8, 9]
    const expected = ['"field" @> $1', [[7, 8, 9]]]

    const filter = filterer.parse(expression)
    const result = await filter()

    expect(result).toEqual(expected)
  })

  it('parses "contains" statements with quoted lists', async () => {
    const expression = ['$contains', ':field', { '': [7, 8, 9] }]
    const expected = ['"field" @> $1', [[7, 8, 9]]]

    const filter = filterer.parse(expression)
    const result = await filter()

    expect(result).toEqual(expected)
  })

  it('negates and expression with "not"', async () => {
    const expression = ['$not', ['=', ':field', 7], ['!=', ':field2', 8]]
    const expected = ['NOT (("field" = $1) AND ("field2" != $2))', [7, 8]]

    const filter = filterer.parse(expression)
    const result = await filter()

    expect(result).toEqual(expected)
  })

  it('parses multiple terms', async () => {
    const testConditions = [
      [['$and', ['=', ':field', 7], ['!=', ':field2', 8]],
        ['("field" = $1) AND ("field2" != $2)', [7, 8]]],

      [['$and', ['=', ':abc', 7], ['!=', ':lmn', 8], ['>=', ':xyz', 9]],
        ['("abc" = $1) AND ("lmn" != $2) AND ("xyz" >= $3)', [7, 8, 9]]],

      [['$or', ['=', ':abc', 7], ['!=', ':lmn', 8], ['<=', ':xyz', 9]],
        ['("abc" = $1) OR ("lmn" != $2) OR ("xyz" <= $3)', [7, 8, 9]]],

      [['$or', ['<', ':field', 7], [
        '$not', ['!=', ':field2', 8], ['>=', ':field3', 9]]],
      ['("field" < $1) OR (NOT (("field2" != $2) AND ("field3" >= $3)))',
        [7, 8, 9]]],

      [['$not', ['=', ':field', 7]], ['NOT (("field" = $1))', [7]]],

      [['>', ':field', 7], ['"field" > $1', [7]]],

      [['$and', ['>=', ':field', 7], ['<=', ':field2', 8]],
        ['("field" >= $1) AND ("field2" <= $2)', [7, 8]]],

      [['$in', ':field', 1, 2, 3], ['"field" = ANY($1)', [[1, 2, 3]]]]
    ]

    for (const condition of testConditions) {
      const filter = filterer.parse(condition[0])
      const result = await filter()
      const expected = condition[1]
      expect(result).toEqual(expected)
    }
  })
})
