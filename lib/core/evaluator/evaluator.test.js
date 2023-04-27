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

  it('evaluates equality expressions', async () => {
    const expression = ['=', ':field', 'hello']
    const object = { field: 'hello' }
    const environment = Environment({ ':': object })

    const result = await evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('evaluates scalars', async () => {
    expect(await evaluator.evaluate(5)).toEqual(5)
    expect(await evaluator.evaluate('hello')).toEqual('hello')
    expect(await evaluator.evaluate(true)).toEqual(true)
  })

  it('evaluates equality expressions with multiple fields', async () => {
    const expression = ['=', ':field', ':field2', 'hello']

    const object1 = { field: 'hello', field2: 'hello' }
    let environment = Environment({ ':': object1 })
    let result = await evaluator.evaluate(expression, environment)
    expect(result).toBe(true)

    const object2 = { field: 'world', field2: 'hello' }
    environment = Environment({ ':': object2 })
    result = await evaluator.evaluate(expression, environment)
    expect(result).toBe(false)
  })

  it('suppots the "$quote" special form', async () => {
    expect(await evaluator.evaluate(
      ['$quote', [1, 2, 3, 'four']])).toEqual([1, 2, 3, 'four'])
    expect(await evaluator.evaluate(
      ['$quote', 'Hello World'])).toEqual('Hello World')
    expect(await evaluator.evaluate(
      ['$quote', '$ilike'])).toEqual('$ilike')
  })

  it('filters by multiple expressions joined by and', async () => {
    const expression = ['$and',
      ['=', ':field', 'hello'],
      ['=', ':field2', 'world']
    ]

    const object1 = { field: 'hello', field2: 'world' }
    let environment = Environment({ ':': object1 })
    let result = await evaluator.evaluate(expression, environment)
    expect(result).toBe(true)

    const object2 = { field: 'world', field2: 'hello' }
    environment = Environment({ ':': object2 })
    result = await evaluator.evaluate(expression, environment)
    expect(result).toBe(false)
  })

  it('filters by multiple expressions joined by or', async () => {
    const expression = ['$or',
      ['=', ':field', 'hello'],
      ['=', ':field2', 'world']
    ]

    const object1 = { field: 'hello', field2: 'hello' }
    let environment = Environment({ ':': object1 })
    let result = await evaluator.evaluate(expression, environment)
    expect(result).toBe(true)

    const object2 = { field: 'world', field2: 'world' }
    environment = Environment({ ':': object2 })
    result = await evaluator.evaluate(expression, environment)
    expect(result).toBe(true)
  })

  it('negates expressions', async () => {
    const expression = ['$not',
      ['=', ':field', 777]
    ]
    const object = { field: 888 }
    const environment = Environment({ ':': object })

    const result = await evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('filters numerical fields', async () => {
    const expression = ['=', ':field', 777]
    const object = { field: 777 }
    const environment = Environment({ ':': object })

    const result = await evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('supports multiple logical operators', async () => {
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
      const result = await evaluator.evaluate(scenario.expression, environment)
      expect(result).toBe(true)
    }
  })

  it('asserts a value is in a quoted list', async () => {
    const expression = ['$in', ':field', { '': [1, 2, 3] }]
    const object = { field: 2 }
    const environment = Environment({ ':': object })

    const result = await evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('asserts a value is in a sequence of elements', async () => {
    const expression = ['$in', ':field', 1, 2, 3]

    const object = { field: 2 }
    const environment = Environment({ ':': object })
    const result = await evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('asserts a quoted value containes a sequence of elements', async () => {
    const expression = ['$contains', { '': [1, 2, 3] }, 1, 3]
    const object = {}
    const environment = Environment({ ':': object })

    const result = await evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('assert a namespaced value contains a sequence of fields', async () => {
    const expression = ['$contains', ':field', 1, 3]

    const object = { field: [1, 2, 3] }
    const environment = Environment({ ':': object })
    const result = await evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('compares a field to a value using like', async () => {
    const expression = ['$like', ':field', '%ell%', '%lo']

    const object = { field: 'Hello' }
    const environment = Environment({ ':': object })
    const result = await evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('compares a field to a case-insensitive value using ilike', async () => {
    const expression = ['$ilike', ':field', '%ell%', '%lo']

    const object = { field: 'HeLLo' }
    const environment = Environment({ ':': object })
    const result = await evaluator.evaluate(expression, environment)

    expect(result).toBe(true)
  })

  it('supports arithmetic operators', async () => {
    const scenarios = [
      { expression: ['+', 5, 7, 3], result: 15 },
      { expression: ['-', 12, 4, 2], result: 6 },
      { expression: ['*', 3, 4, 5], result: 60 },
      { expression: ['/', 12, 3, 4], result: 1 }
    ]

    for (const scenario of scenarios) {
      const result = await evaluator.evaluate(scenario.expression)
      expect(result).toEqual(scenario.result)
    }
  })

  it('uses arithmetic operators in conditions', async () => {
    let expression = ['=', ['*', ':length', ':width'], 15]
    let object = { length: 3, width: 5 }
    let environment = Environment({ ':': object })
    let result = await evaluator.evaluate(expression, environment)
    expect(result).toBe(true)

    expression = [
      '=',
      ['/', ['-', ['+', ['*', ':length', ':width'], 3, 2], 8], 2, 2],
      3
    ]
    object = { length: 3, width: 5 }
    environment = Environment({ ':': object })
    result = await evaluator.evaluate(expression, environment)
    expect(result).toBe(true)
  })

  it('supports object operators', async () => {
    const scenarios = [
      { expression: ['_get', { age: 34 }, 'age'], result: 34 },
      { expression: ['_get', { age: 34 }, 'height', 177], result: 177 }
    ]

    for (const scenario of scenarios) {
      const result = await evaluator.evaluate(scenario.expression)
      expect(result).toEqual(scenario.result)
    }
  })

  it('supports collection operators', async () => {
    const scenarios = [
      {
        expression: ['_map', 'id', [
          '$quote', [{ id: 1 }, { id: 2 }, { id: 3 }]]],
        result: [1, 2, 3]
      },
      {
        expression: ['_unique', ['$quote', [1, 2, 3, 3, 3]]],
        result: [1, 2, 3]
      },
      {
        expression: ['_size', ['$quote', [1, 2, 3, 3, 3]]],
        result: 5
      }
    ]

    for (const scenario of scenarios) {
      const result = await evaluator.evaluate(scenario.expression)
      expect(result).toEqual(scenario.result)
    }
  })

  it('supports chained collection operators', async () => {
    const scenarios = [
      {
        expression: ['_unique', ['_map', 'id', [
          '$quote', [{ id: 1 }, { id: 2 }, { id: 3 }]]]],
        result: [1, 2, 3]
      },
      {
        expression: ['_size', ['_unique', ['_map', 'id', [
          '$quote', [{ id: 3 }, { id: 3 }, { id: 3 }]]]]],
        result: 1
      },
      {
        expression: ['_size', ['_unique', ['_map', 'id',
          { '': [{ id: 3 }, { id: 3 }, { id: 3 }] }]]],
        result: 1
      }
    ]

    for (const scenario of scenarios) {
      const result = await evaluator.evaluate(scenario.expression)
      expect(result).toEqual(scenario.result)
    }
  })

  it('expands the namespaces of a given environment', async () => {
    const evaluator = new Evaluator({ namespaces: ['@'] })
    const expression = ['_map', 'code', '@items']
    const items = [{ code: 1 }, { code: 2 }, { code: 3 }]
    const environment = Environment({ '@': { items } })

    const expanded = evaluator.expand(expression, environment)

    expect(expanded).toEqual(
      ['_map', 'code', { '': [{ code: 1 }, { code: 2 }, { code: 3 }] }])
  })

  it('expands from nested lists the configured evaluator namespaces', () => {
    const evaluator = new Evaluator({ namespaces: ['@'] })
    const expression = [
      '$and',
      ['$in', 2, ['_map', 'code', '@items']],
      ['=', ['_get', '@object', 'name'], 'John Doe']
    ]
    const items = [{ code: 1 }, { code: 2 }, { code: 3 }]
    const object = { name: 'John Doe' }
    const environment = Environment({ '@': { items, object } })

    const expanded = evaluator.expand(expression, environment)

    expect(expanded).toEqual([
      '$and',
      ['$in', 2, ['_map', 'code', {
        '': [{ code: 1 }, { code: 2 }, { code: 3 }]
      }]],
      ['=', ['_get', { name: 'John Doe' }, 'name'], 'John Doe']
    ])
  })

  it('can await pending promises in parallel', async () => {
    const first = async () => 1
    const second = async () => 2
    const third = async () => 3

    const expression = ['+', ['$wait', first(), second(), third()]]

    const result = await evaluator.evaluate(expression)

    expect(result).toEqual(6)
  })
})

describe('Evaluator:Query', () => {
  let evaluator = null
  beforeEach(() => {
    evaluator = new Evaluator({ namespaces: [':', '@'] })
  })

  it('processes "from" clauses', async () => {
    const Alpha = [
      { id: 'A001' },
      { id: 'A002' },
      { id: 'A003' }
    ]
    const Beta = [
      { id: 'B001' },
      { id: 'B002' },
      { id: 'B003' }
    ]
    const environment = Environment({ '@': { Alpha, Beta } })

    const expression = ['$from', ['$as', 'Beta', '@Beta']]
    const expanded = await evaluator.evaluate(expression, environment)

    expect(expanded).toEqual([
      { Beta: { id: 'B001' } },
      { Beta: { id: 'B002' } },
      { Beta: { id: 'B003' } }
    ])
  })

  it('processes "where" clauses', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe' },
      { id: 'A002', name: 'Donald Duck' },
      { id: 'A003', name: 'Ronald Roe' }
    ]
    const Beta = [
      { id: 'B001' },
      { id: 'B002' },
      { id: 'B003' }
    ]
    const environment = Environment({ '@': { Alpha, Beta } })

    const expression = [
      '$where',

      ['$ilike', ':name', '%oe%'],

      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]
    const expanded = await evaluator.evaluate(expression, environment)

    expect(expanded).toEqual([
      { Alpha: { id: 'A001', name: 'John Doe' } },
      { Alpha: { id: 'A003', name: 'Ronald Roe' } }
    ])
  })

  it('processes "select" clauses', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', age: 45 },
      { id: 'A002', name: 'Donald Duck', age: 50 },
      { id: 'A003', name: 'Ronald Roe', age: 17 }
    ]
    const environment = Environment({ '@': { Alpha } })

    const expression = [
      '$select', [':name', ':age'],

      ['$where', ['$ilike', ':name', '%uc%'],

        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]

    const expanded = await evaluator.evaluate(expression, environment)

    expect(expanded).toEqual([
      { name: 'Donald Duck', age: 50 }
    ])
  })

  it('processes "group" clauses', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 45 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: 50 },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 },
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 },
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 }
    ]
    const environment = Environment({ '@': { Alpha } })

    const expression = [
      '$group', [':city'],

      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await evaluator.evaluate(expression, environment)

    expect(expanded).toEqual([
      {
        __groups__: { city: 'Popayan' },
        __items__: [
          {
            Alpha: { id: 'A001', name: 'John Doe', city: 'Popayan', age: 45 }
          },
          {
            Alpha: { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 }
          },
          {
            Alpha: { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 }
          }
        ]
      },
      {
        __groups__: { city: 'Cali' },
        __items__: [
          {
            Alpha: { id: 'A002', name: 'Donald Duck', city: 'Cali', age: 50 }
          }
        ]
      },
      {
        __groups__: { city: 'Bogota' },
        __items__: [
          {
            Alpha: { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 }
          }
        ]
      }
    ])
  })

  it('processes "having" clauses', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 45 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: 50 },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 },
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 },
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 }
    ]
    const environment = Environment({ '@': { Alpha } })

    const expression = [
      '$having', ['>', ['$count', ':id'], '1'],
      ['$group', [':city'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const expanded = await evaluator.evaluate(expression, environment)

    expect(expanded).toEqual([
      {
        __groups__: { city: 'Popayan' },
        __items__: [
          {
            Alpha: { id: 'A001', name: 'John Doe', city: 'Popayan', age: 45 }
          },
          {
            Alpha: { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 }
          },
          {
            Alpha: { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 }
          }
        ]
      }
    ])
  })

  it('processes aggregate functions in "select" clauses', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 45 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: 50 },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 },
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 },
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 }
    ]
    const environment = Environment({ '@': { Alpha } })

    const expression = [
      '$select', [':city', ['$count', ':id']], [
        '$having', ['>', ['$count', ':id'], '1'],
        ['$group', [':city'],
          ['$where', ['$ilike', ':name', '%oe%'],
            ['$from', ['$as', 'Alpha', '@Alpha']]]]
      ]
    ]
    const expanded = await evaluator.evaluate(expression, environment)

    expect(expanded).toEqual([
      { city: 'Popayan', count_id: 2 }
    ])
  })

  it('processes "join" clauses', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe' },
      { id: 'A002', name: 'Donald Duck' },
      { id: 'A003', name: 'Ronald Roe' }
    ]
    const Beta = [
      { id: 'B001', alphaId: 'A001' },
      { id: 'B002', alphaId: 'A001' },
      { id: 'B003', alphaId: 'A003' },
      { id: 'B004', alphaId: 'A003' },
      { id: 'B005', alphaId: 'A002' }
    ]
    const environment = Environment({ '@': { Alpha, Beta } })

    const expression = [
      '$join', ['$as', 'Beta', '@Beta'],
      ['=', 'Alpha:id', 'Beta:alphaId'],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]
    const expanded = await evaluator.evaluate(expression, environment)

    expect(expanded).toEqual([
      {
        Alpha: { id: 'A001', name: 'John Doe' },
        Beta: { id: 'B001', alphaId: 'A001' }
      },
      {
        Alpha: { id: 'A001', name: 'John Doe' },
        Beta: { id: 'B002', alphaId: 'A001' }
      },
      {
        Alpha: { id: 'A003', name: 'Ronald Roe' },
        Beta: { id: 'B003', alphaId: 'A003' }
      },
      {
        Alpha: { id: 'A003', name: 'Ronald Roe' },
        Beta: { id: 'B004', alphaId: 'A003' }
      },
      {
        Alpha: { id: 'A002', name: 'Donald Duck' },
        Beta: { id: 'B005', alphaId: 'A002' }
      }
    ])
  })

  it('processes "order" clauses', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 45 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: 50 },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 },
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 },
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 }
    ]
    const environment = Environment({ '@': { Alpha } })

    const expression = [
      '$select', [':id', ':name', ':city', ':age'],
      ['$order', [{ ':city': '$desc' }, ':age'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const expanded = await evaluator.evaluate(expression, environment)

    expect(expanded).toEqual([
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 },
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 },
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 45 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: 50 },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 }
    ])
  })

  it('processes "limit" clauses', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 45 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: 50 },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 },
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 },
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 }
    ]
    const environment = Environment({ '@': { Alpha } })

    const expression = [
      '$select', [':id', ':name', ':city', ':age'],
      ['$limit', { offset: 1, limit: 2 },
        ['$order', [{ ':city': '$desc' }, ':age'],
          ['$from', ['$as', 'Alpha', '@Alpha']]]]
    ]
    const expanded = await evaluator.evaluate(expression, environment)

    expect(expanded).toEqual([
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 },
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 45 }
    ])
  })

  it('implements multiple aggregate functions', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 47 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: 50 },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 },
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 },
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 },
      { id: 'A006', name: 'Stephen Cane', city: 'Bogota', age: 37 },
      { id: 'A007', name: 'Martin Swift', city: 'Bogota', age: 24 },
      { id: 'A008', name: 'Martin Swift', city: 'Bogota', age: 24 }
    ]
    const environment = Environment({ '@': { Alpha } })

    const expression = [
      '$select', [':city', ['$count', ':id'],
        ['$sum', ':age'], ['$avg', ':age'],
        ['$min', ':age'], ['$max', ':age']],
      ['$group', [':city'],
        ['$from', ['$as', 'Alpha', '@Alpha']]
      ]
    ]
    const expanded = await evaluator.evaluate(expression, environment)

    expect(expanded).toEqual([
      {
        city: 'Popayan',
        count_id: 3,
        sum_age: 105,
        avg_age: 35,
        min_age: 26,
        max_age: 47
      },
      {
        city: 'Cali',
        count_id: 1,
        sum_age: 50,
        avg_age: 50,
        min_age: 50,
        max_age: 50
      },
      {
        city: 'Bogota',
        count_id: 4,
        sum_age: 102,
        avg_age: 25.5,
        min_age: 17,
        max_age: 37
      }
    ])
  })

  it('supports the "*" identifier inside "select" and "count"', async () => {
    const Alpha = [
      { id: 'A001', region: 'South', city: 'Popayan', age: 45 },
      { id: 'A002', region: 'South', city: 'Cali', age: 50 },
      { id: 'A003', region: 'Center', city: 'Bogota', age: 17 },
      { id: 'A004', region: 'South', city: 'Popayan', age: 26 },
      { id: 'A005', region: 'South', city: 'Popayan', age: 32 }
    ]
    const environment = Environment({ '@': { Alpha } })

    const expression = [
      '$select', [':*', ['$count', ':*']],
      ['$order', [':region', ':city'],
        ['$group', [':region', ':city'],
          ['$from', ['$as', 'Alpha', '@Alpha']]]]
    ]
    const expanded = await evaluator.evaluate(expression, environment)

    expect(expanded).toEqual([
      { region: 'Center', city: 'Bogota', count: 1 },
      { region: 'South', city: 'Cali', count: 1 },
      { region: 'South', city: 'Popayan', count: 3 }
    ])
  })
})
