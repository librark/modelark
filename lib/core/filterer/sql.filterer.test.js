import { describe, expect, it, beforeEach } from '@jest/globals'
import { SqlFilterer } from './sql.filterer.js'

describe('Fiterer', () => {
  let filterer = null

  beforeEach(() => {
    filterer = new SqlFilterer()
  })

  it('can be instantiated', () => {
    expect(filterer).toBeTruthy()
  })

  it('parses condition tuples', () => {
    const tuples = [
      [['=', ':field', 99], ['"field" = $1', [99]]],
      [['$like', ':field', 'world'], ['"field" LIKE $1', ['world']]],
      [['$ilike', ':field', 'world'], ['"field" ILIKE $1', ['world']]]
    ]

    for (const [tuple, expected] of tuples) {
      const result = filterer.parse(tuple)
      expect(result).toEqual(expected)
    }
  })

  it('parses single terms', () => {
    const expression = ['=', ':field', 7]
    const expected = ['"field" = $1', [7]]

    const result = filterer.parse(expression)

    expect(result).toEqual(expected)
  })

  it('does not parse terms without fields', () => {
    const expression = ['=', ['+', 2, 5], 7]

    expect(() => filterer.parse(expression)).toThrow(
      'Query parsing error. Malformed filtering expression.')
  })

  it('parses single terms with multiple values', () => {
    const expression = ['=', ':field', 7, ':column']
    const expected = ['"field" = $1 AND "column" = $2', [7, 7]]

    const result = filterer.parse(expression)

    expect(result).toEqual(expected)
  })

  it('parses "in" statements', () => {
    const expression = ['$in', ':field', 7, 8, 9]
    const expected = ['"field" = ANY($1)', [[7, 8, 9]]]

    const result = filterer.parse(expression)

    expect(result).toEqual(expected)
  })

  it('parses "in" statements with quoted lists', () => {
    const expression = ['$in', ':field', { '': [7, 8, 9] }]
    const expected = ['"field" = ANY($1)', [[7, 8, 9]]]

    const result = filterer.parse(expression)

    expect(result).toEqual(expected)
  })

  it('parses "contains" statements', () => {
    const expression = ['$contains', ':field', 7, 8, 9]
    const expected = ['"field" @> $1', [[7, 8, 9]]]

    const result = filterer.parse(expression)

    expect(result).toEqual(expected)
  })

  it('parses "contains" statements with quoted lists', () => {
    const expression = ['$contains', ':field', { '': [7, 8, 9] }]
    const expected = ['"field" @> $1', [[7, 8, 9]]]

    const result = filterer.parse(expression)

    expect(result).toEqual(expected)
  })

  it('negates and expression with "not"', () => {
    const expression = ['$not', ['=', ':field', 7], ['!=', ':field2', 8]]
    const expected = ['NOT ("field" = $1 AND "field2" != $2)', [7, 8]]

    const result = filterer.parse(expression)

    expect(result).toEqual(expected)
  })

  it('parses multiple terms', () => {
    const testConditions = [
      [['$and', ['=', ':field', 7], ['!=', ':field2', 8]],
        ['"field" = $1 AND "field2" != $2', [7, 8]]],

      [['$and', ['=', ':abc', 7], ['!=', ':lmn', 8], ['>=', ':xyz', 9]],
        ['"abc" = $1 AND "lmn" != $2 AND "xyz" >= $3', [7, 8, 9]]],

      [['$or', ['=', ':abc', 7], ['!=', ':lmn', 8], ['<=', ':xyz', 9]],
        ['"abc" = $1 OR "lmn" != $2 OR "xyz" <= $3', [7, 8, 9]]],

      [['$or', ['<', ':field', 7], [
        '$not', ['!=', ':field2', 8], ['>=', ':field3', 9]]],
      ['"field" < $1 OR NOT ("field2" != $2 AND "field3" >= $3)', [7, 8, 9]]],

      [['$not', ['=', ':field', 7]], ['NOT ("field" = $1)', [7]]],

      [['>', ':field', 7], ['"field" > $1', [7]]],

      [['$and', ['>=', ':field', 7], ['<=', ':field2', 8]],
        ['"field" >= $1 AND "field2" <= $2', [7, 8]]],

      [['$in', ':field', 1, 2, 3], ['"field" = ANY($1)', [[1, 2, 3]]]]
    ]

    for (const condition of testConditions) {
      const result = filterer.parse(condition[0])
      const expected = condition[1]
      expect(result).toEqual(expected)
    }
  })

  it('parses object operators over JSONB fields', () => {
    let expression = ['$get', ':field', 'nested.attribute']
    let expected = [
      '(SELECT jsonb_extract_path("field", $1, $2))', ['nested', 'attribute']]

    expect(filterer.parse(expression)).toEqual(expected)

    expression = ['$get', { nested: { attribute: 5 } }, 'nested.attribute']
    expected = ['(SELECT $1)', [5]]

    expect(filterer.parse(expression)).toEqual(expected)
  })

  it('maps collection operators over JSONB fields', () => {
    let expression = ['$map', 'attribute', ':field']
    let expected = [
      '(SELECT jsonb_extract_path("map"."value", $1) ' +
      'FROM jsonb_array_elements("field") AS "map")', ['attribute']]

    expect(filterer.parse(expression)).toEqual(expected)

    expression = ['$map', 'attribute', ['$quote', [
      { attribute: 1 }, { attribute: 2 }, { attribute: 3 }]]]
    expected = ['(SELECT $1)', [[1, 2, 3]]]

    expect(filterer.parse(expression)).toEqual(expected)
  })

  it('gets the unique elements of a collection over JSONB fields', () => {
    let expression = ['$unique', ':field']
    let expected = [
      '(SELECT DISTINCT jsonb_array_elements("field"))', []]

    expect(filterer.parse(expression)).toEqual(expected)

    expression = ['$unique', ['$quote', [1, 2, 3, 3]]]
    expected = ['(SELECT $1)', [[1, 2, 3]]]

    expect(filterer.parse(expression)).toEqual(expected)
  })
})
