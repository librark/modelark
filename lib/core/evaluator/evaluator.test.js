import { describe, expect, it, beforeEach } from '@jest/globals'
import { Environment } from './environment.js'
import { Evaluator } from './evaluator.js'

describe('Evaluator', () => {
  let evaluator = null
  beforeEach(() => {
    evaluator = new Evaluator()
  })

  it('can be instantiated', () => {
    expect(evaluator).toBeTruthy()
  })

  it('evaluates equality expressions', () => {
    const expression = ['=', ':field', 'hello']
    const object = { field: 'hello' }
    const environment = Environment({ ':': object })

    const result = evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('evaluates scalars', () => {
    expect(evaluator.evaluate(5)).toEqual(5)
    expect(evaluator.evaluate('hello')).toEqual('hello')
    expect(evaluator.evaluate(true)).toEqual(true)
  })

  it('evaluates equality expressions with multiple fields', () => {
    const expression = ['=', ':field', ':field2', 'hello']

    const object1 = { field: 'hello', field2: 'hello' }
    let environment = Environment({ ':': object1 })
    let result = evaluator.evaluate(expression, environment)
    expect(result).toBe(true)

    const object2 = { field: 'world', field2: 'hello' }
    environment = Environment({ ':': object2 })
    result = evaluator.evaluate(expression, environment)
    expect(result).toBe(false)
  })

  it('suppots the "$quote" special form', () => {
    expect(evaluator.evaluate(
      ['$quote', [1, 2, 3, 'four']])).toEqual([1, 2, 3, 'four'])
    expect(evaluator.evaluate(
      ['$quote', 'Hello World'])).toEqual('Hello World')
    expect(evaluator.evaluate(
      ['$quote', '$ilike'])).toEqual('$ilike')
  })

  it('filters by multiple expressions joined by and', () => {
    const expression = ['$and',
      ['=', ':field', 'hello'],
      ['=', ':field2', 'world']
    ]

    const object1 = { field: 'hello', field2: 'world' }
    let environment = Environment({ ':': object1 })
    let result = evaluator.evaluate(expression, environment)
    expect(result).toBe(true)

    const object2 = { field: 'world', field2: 'hello' }
    environment = Environment({ ':': object2 })
    result = evaluator.evaluate(expression, environment)
    expect(result).toBe(false)
  })

  it('filters by multiple expressions joined by or', () => {
    const expression = ['$or',
      ['=', ':field', 'hello'],
      ['=', ':field2', 'world']
    ]

    const object1 = { field: 'hello', field2: 'hello' }
    let environment = Environment({ ':': object1 })
    let result = evaluator.evaluate(expression, environment)
    expect(result).toBe(true)

    const object2 = { field: 'world', field2: 'world' }
    environment = Environment({ ':': object2 })
    result = evaluator.evaluate(expression, environment)
    expect(result).toBe(true)
  })

  it('negates expressions', () => {
    const expression = ['$not',
      ['=', ':field', 777]
    ]
    const object = { field: 888 }
    const environment = Environment({ ':': object })

    const result = evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('filters numerical fields', () => {
    const expression = ['=', ':field', 777]
    const object = { field: 777 }
    const environment = Environment({ ':': object })

    const result = evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('supports multiple logical operators', () => {
    const scenarios = [
      { expression: ['=', ':field', 5, 5], object: { field: 5 } },
      { expression: ['!=', ':field', 3, 4], object: { field: 5 } },
      { expression: ['>', ':field', 4, 3], object: { field: 5 } },
      { expression: ['<', ':field', 6, 7], object: { field: 5 } },
      { expression: ['>=', ':field', 3, 1], object: { field: 3 } },
      { expression: ['<=', ':field', 3, 6], object: { field: 3 } }
    ]

    for (const scenario of scenarios) {
      const environment = Environment({ ':': scenario.object })
      const result = evaluator.evaluate(scenario.expression, environment)
      expect(result).toBe(true)
    }
  })

  it('asserts a value is in a quoted list', () => {
    const expression = ['$in', ':field', { '': [1, 2, 3] }]
    const object = { field: 2 }
    const environment = Environment({ ':': object })

    const result = evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('asserts a value is in a sequence of elements', () => {
    const expression = ['$in', ':field', 1, 2, 3]

    const object = { field: 2 }
    const environment = Environment({ ':': object })
    const result = evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('asserts a quoted value containes a sequence of elements', () => {
    const expression = ['$contains', { '': [1, 2, 3] }, 1, 3]
    const object = {}
    const environment = Environment({ ':': object })

    const result = evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('assert a namespaced value contains a sequence of fields', () => {
    const expression = ['$contains', ':field', 1, 3]

    const object = { field: [1, 2, 3] }
    const environment = Environment({ ':': object })
    const result = evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('compares a field to a value using like', () => {
    const expression = ['$like', ':field', '%ell%', '%lo']

    const object = { field: 'Hello' }
    const environment = Environment({ ':': object })
    const result = evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('compares a field to a case-insensitive value using ilike', () => {
    const expression = ['$ilike', ':field', '%ell%', '%lo']

    const object = { field: 'HeLLo' }
    const environment = Environment({ ':': object })
    const result = evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('supports arithmetic operators', () => {
    const scenarios = [
      { expression: ['+', 5, 7, 3], result: 15 },
      { expression: ['-', 12, 4, 2], result: 6 },
      { expression: ['*', 3, 4, 5], result: 60 },
      { expression: ['/', 12, 3, 4], result: 1 }
    ]

    for (const scenario of scenarios) {
      const result = evaluator.evaluate(scenario.expression)
      expect(result).toEqual(scenario.result)
    }
  })

  it('uses arithmetic operators in conditions', () => {
    let expression = ['=', ['*', ':length', ':width'], 15]
    let object = { length: 3, width: 5 }
    let environment = Environment({ ':': object })
    let result = evaluator.evaluate(expression, environment)
    expect(result).toBe(true)

    expression = [
      '=',
      ['/', ['-', ['+', ['*', ':length', ':width'], 3, 2], 8], 2, 2],
      3
    ]
    object = { length: 3, width: 5 }
    environment = Environment({ ':': object })
    result = evaluator.evaluate(expression, environment)
    expect(result).toBe(true)
  })

  it('supports object operators', () => {
    const scenarios = [
      { expression: ['$get', { age: 34 }, 'age'], result: 34 },
      { expression: ['$get', { age: 34 }, 'height', 177], result: 177 }
    ]

    for (const scenario of scenarios) {
      const result = evaluator.evaluate(scenario.expression)
      expect(result).toEqual(scenario.result)
    }
  })

  it('supports collection operators', () => {
    const scenarios = [
      {
        expression: ['$map', 'id', [
          '$quote', [{ id: 1 }, { id: 2 }, { id: 3 }]]],
        result: [1, 2, 3]
      },
      {
        expression: ['$unique', ['$quote', [1, 2, 3, 3, 3]]],
        result: [1, 2, 3]
      },
      {
        expression: ['$size', ['$quote', [1, 2, 3, 3, 3]]],
        result: 5
      }
    ]

    for (const scenario of scenarios) {
      const result = evaluator.evaluate(scenario.expression)
      expect(result).toEqual(scenario.result)
    }
  })

  it('supports chained collection operators', () => {
    const scenarios = [
      {
        expression: ['$unique', ['$map', 'id', [
          '$quote', [{ id: 1 }, { id: 2 }, { id: 3 }]]]],
        result: [1, 2, 3]
      },
      {
        expression: ['$size', ['$unique', ['$map', 'id', [
          '$quote', [{ id: 3 }, { id: 3 }, { id: 3 }]]]]],
        result: 1
      },
      {
        expression: ['$size', ['$unique', ['$map', 'id',
          { '': [{ id: 3 }, { id: 3 }, { id: 3 }] }]]],
        result: 1
      }
    ]

    for (const scenario of scenarios) {
      const result = evaluator.evaluate(scenario.expression)
      expect(result).toEqual(scenario.result)
    }
  })

  it('expands the namespaces of a given environment', () => {
    const evaluator = new Evaluator({ namespaces: ['@'] })
    const expression = ['$map', 'code', '@items']
    const items = [{ code: 1 }, { code: 2 }, { code: 3 }]
    const environment = Environment({ '@': { items } })

    const expanded = evaluator.expand(expression, environment)

    expect(expanded).toEqual(
      ['$map', 'code', { '': [{ code: 1 }, { code: 2 }, { code: 3 }] }])
  })

  it('expands from nested lists the configured evaluator namespaces', () => {
    const evaluator = new Evaluator({ namespaces: ['@'] })
    const expression = [
      '$and',
      ['$in', 2, ['$map', 'code', '@items']],
      ['=', ['$get', '@object', 'name'], 'John Doe']
    ]
    const items = [{ code: 1 }, { code: 2 }, { code: 3 }]
    const object = { name: 'John Doe' }
    const environment = Environment({ '@': { items, object } })

    const expanded = evaluator.expand(expression, environment)

    expect(expanded).toEqual([
      '$and',
      ['$in', 2, ['$map', 'code', {
        '': [{ code: 1 }, { code: 2 }, { code: 3 }]
      }]],
      ['=', ['$get', { name: 'John Doe' }, 'name'], 'John Doe']
    ])
  })
})
