import { describe, expect, it, beforeEach } from '@jest/globals'
import { DataParser } from './data.parser.js'

describe('DataParser', () => {
  let parser = null
  beforeEach(() => {
    parser = new DataParser()
  })

  it('can be instantiated', () => {
    expect(parser).toBeTruthy()
  })

  it('evaluates equality expressions', async () => {
    const expression = ['=', ':field', 'hello']
    const object = { field: 'hello' }
    const context = { ':': object }

    const result = await parser.parse(expression, context)

    expect(result).toBe(true)
  })

  it('evaluates scalars', async () => {
    expect(await parser.parse(5)).toEqual(5)
    expect(await parser.parse('hello')).toEqual('hello')
    expect(await parser.parse(true)).toEqual(true)
  })

  it('evaluates equality expressions with multiple fields', async () => {
    const expression = ['=', ':field', ':field2', 'hello']

    const object1 = { field: 'hello', field2: 'hello' }
    let result = await parser.parse(expression, { ':': object1 })
    expect(result).toBe(true)

    const object2 = { field: 'world', field2: 'hello' }
    result = await parser.parse(expression, { ':': object2 })
    expect(result).toBe(false)
  })

  it('supports the "$quote" special form', async () => {
    expect(await parser.parse(
      ['$quote', [1, 2, 3, 'four']])).toEqual([1, 2, 3, 'four'])
    expect(await parser.parse(
      ['$quote', 'Hello World'])).toEqual('Hello World')
    expect(await parser.parse(
      ['$quote', '$ilike'])).toEqual('$ilike')
  })

  it('filters by multiple expressions joined by and', async () => {
    const expression = ['$and',
      ['=', ':field', 'hello'],
      ['=', ':field2', 'world']
    ]

    const object1 = { field: 'hello', field2: 'world' }
    let result = await parser.parse(expression, { ':': object1 })
    expect(result).toBe(true)

    const object2 = { field: 'world', field2: 'hello' }
    result = await parser.parse(expression, { ':': object2 })
    expect(result).toBe(false)
  })

  it('filters by multiple expressions joined by or', async () => {
    const expression = ['$or',
      ['=', ':field', 'hello'],
      ['=', ':field2', 'world']
    ]

    const object1 = { field: 'hello', field2: 'hello' }
    let result = await parser.parse(expression, { ':': object1 })
    expect(result).toBe(true)

    const object2 = { field: 'world', field2: 'world' }
    result = await parser.parse(expression, { ':': object2 })
    expect(result).toBe(true)
  })

  it('negates expressions', async () => {
    const expression = ['$not',
      ['=', ':field', 777]
    ]
    const object = { field: 888 }

    const result = await parser.parse(expression, { ':': object })

    expect(result).toBe(true)
  })

  it('filters numerical fields', async () => {
    const expression = ['=', ':field', 777]
    const object = { field: 777 }

    const result = await parser.parse(expression, { ':': object })

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
      const result = await parser.parse(
        scenario.expression, { ':': scenario.object })
      expect(result).toBe(true)
    }
  })

  it('asserts a value is in a quoted list', async () => {
    const expression = ['$in', ':field', { '': [1, 2, 3] }]
    const object = { field: 2 }

    const result = await parser.parse(expression, { ':': object })

    expect(result).toBe(true)
  })

  it('treats null values within an $in expression as in sql', async () => {
    const expression = ['$in', ':field', { '': [1, 2, 3, null] }]

    expect(await parser.parse(expression, { ':': { field: 3 } })).toBe(true)
    expect(await parser.parse(expression, { ':': { field: null } })).toBe(false)
  })

  it('asserts a value is in a sequence of elements', async () => {
    const expression = ['$in', ':field', 1, 2, 3]

    const object = { field: 2 }
    const result = await parser.parse(expression, { ':': object })

    expect(result).toBe(true)
  })

  it('asserts a quoted value containes a sequence of elements', async () => {
    const expression = ['$contains', { '': [1, 2, 3] }, 1, 3]
    const object = {}

    const result = await parser.parse(expression, { ':': object })

    expect(result).toBe(true)
  })

  it('assert a namespaced value contains a sequence of fields', async () => {
    const expression = ['$contains', ':field', 1, 3]

    const object = { field: [1, 2, 3] }
    const result = await parser.parse(expression, { ':': object })

    expect(result).toBe(true)
  })

  it('compares a field to a value using like', async () => {
    const expression = ['$like', ':field', '%ell%', '%lo']

    const object = { field: 'Hello' }
    const result = await parser.parse(expression, { ':': object })

    expect(result).toBe(true)
  })

  it('compares a field to a case-insensitive value using ilike', async () => {
    const expression = ['$ilike', ':field', '%ell%', '%lo']

    const object = { field: 'HeLLo' }
    const result = await parser.parse(expression, { ':': object })

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
      const result = await parser.parse(scenario.expression)
      expect(result).toEqual(scenario.result)
    }
  })

  it('uses arithmetic operators in conditions', async () => {
    let expression = ['=', ['*', ':length', ':width'], 15]
    let object = { length: 3, width: 5 }
    let result = await parser.parse(expression, { ':': object })
    expect(result).toBe(true)

    expression = [
      '=',
      ['/', ['-', ['+', ['*', ':length', ':width'], 3, 2], 8], 2, 2],
      3
    ]
    object = { length: 3, width: 5 }
    result = await parser.parse(expression, { ':': object })
    expect(result).toBe(true)
  })

  it('joins multiple values as strings', async () => {
    const scenarios = [
      {
        expression: ['_join', {}, { '': ['one', 'two', 'three'] }],
        result: 'one,two,three'
      },
      {
        expression: [
          '_join', { separator: '-' }, { '': ['one', 'two', 'three'] }],
        result: 'one-two-three'
      },
      {
        expression: [
          '_join', { separator: ' | ' }, 'one', 'two', 'three'],
        result: 'one | two | three'
      }
    ]

    for (const scenario of scenarios) {
      const result = await parser.parse(scenario.expression)
      expect(result).toEqual(scenario.result)
    }
  })

  it('joins multiple values mapping them', async () => {
    const scenarios = [
      {
        expression: [
          '_join', { map: true }, {
            '': [['one', 1], ['two', 2], ['three', 3]]
          }],
        result: ['one,1', 'two,2', 'three,3']
      },
      {
        expression: [
          '_join', { map: true }, {
            '': [['one', 1], ['two', 2], ['three', 3]]
          }],
        result: ['one,1', 'two,2', 'three,3']
      },
      {
        expression: [
          '_join', { map: true }, {
            '': [['one', 1], ['two', 2], ['three', 3]]
          }, { '': [['four', 4], ['five', 5]] }],
        result: ['one,1', 'two,2', 'three,3', 'four,4', 'five,5']
      }
    ]

    for (const scenario of scenarios) {
      const result = await parser.parse(scenario.expression)
      expect(result).toEqual(scenario.result)
    }
  })

  it('supports object operators', async () => {
    const scenarios = [
      { expression: ['_get', 'age', { age: 34 }], result: 34 },
      { expression: ['_get', 'height', { age: 34 }, 177], result: 177 }
    ]

    for (const scenario of scenarios) {
      const result = await parser.parse(scenario.expression)
      expect(result).toEqual(scenario.result)
    }
  })

  it('supports getting multiple fields', async () => {
    const scenarios = [
      {
        expression: ['_get', 'age,name', { age: 34, name: 'John Doe' }],
        result: [34, 'John Doe']
      },
      {
        expression: ['_get', 'data.name, data.age',
          { data: { age: 34, name: 'John Doe' } }],
        result: ['John Doe', 34]
      },
      {
        expression: ['_get', 'data.name',
          { data: { age: 34, name: 'John Doe' } }],
        result: 'John Doe'
      }
    ]

    for (const scenario of scenarios) {
      const result = await parser.parse(scenario.expression)
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
      const result = await parser.parse(scenario.expression)
      expect(result).toEqual(scenario.result)
    }
  })

  it('supports mapping multiple fields', async () => {
    const scenarios = [
      {
        expression: ['_map', 'id,name', {
          '': [
            { id: 1, name: 'jdoe' },
            { id: 2, name: 'rroe' },
            { id: 3, name: 'mmoe' }
          ]
        }],
        result: [[1, 'jdoe'], [2, 'rroe'], [3, 'mmoe']]
      },
      {
        expression: ['_map', 'name,id', {
          '': [
            { id: 1, name: 'jdoe' },
            { id: 2, name: 'rroe' },
            { id: 3, name: 'mmoe' }
          ]
        }],
        result: [['jdoe', 1], ['rroe', 2], ['mmoe', 3]]
      },
      {
        expression: ['_map', 'id', {
          '': [
            { id: 1, name: 'jdoe' },
            { id: 2, name: 'rroe' },
            { id: 3, name: 'mmoe' }
          ]
        }],
        result: [1, 2, 3]
      }
    ]

    for (const scenario of scenarios) {
      const result = await parser.parse(scenario.expression)
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
      const result = await parser.parse(scenario.expression)
      expect(result).toEqual(scenario.result)
    }
  })

  it('can await pending promises in parallel', async () => {
    const first = async () => 1
    const second = async () => 2
    const third = async () => 3

    const expression = ['+', ['_wait', first(), second(), third()]]

    const result = await parser.parse(expression)

    expect(result).toEqual(6)
  })
})

describe('DataParser:Query', () => {
  let parser = null
  beforeEach(() => {
    parser = new DataParser({ namespaces: [':', '@'] })
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

    const expression = ['$from', ['$as', 'Beta', '@Beta']]
    const expanded = await parser.parse(expression, { '@': { Alpha, Beta } })

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

    const expression = [
      '$where',

      ['$ilike', ':name', '%oe%'],

      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha, Beta } })

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

    const expression = [
      '$select', [':name', ':age'],

      ['$where', ['$ilike', ':name', '%uc%'],

        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { name: 'Donald Duck', age: 50 }
    ])
  })

  it('implement the "for" locking clause as a no-op', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', age: 45 },
      { id: 'A002', name: 'Donald Duck', age: 50 },
      { id: 'A003', name: 'Ronald Roe', age: 17 }
    ]

    const expression = [
      '$for', 'update',

      ['$select', [':name', ':age'],

        ['$where', ['$ilike', ':name', '%uc%'],

          ['$from', ['$as', 'Alpha', '@Alpha']]]
      ]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

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

    const expression = [
      '$group', [':city'],

      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      {
        '': { city: 'Popayan' },
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
        '': { city: 'Cali' },
        __items__: [
          {
            Alpha: { id: 'A002', name: 'Donald Duck', city: 'Cali', age: 50 }
          }
        ]
      },
      {
        '': { city: 'Bogota' },
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

    const expression = [
      '$having', ['>', ['$count', ':id'], '1'],
      ['$group', [':city'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      {
        '': { city: 'Popayan' },
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

  it('processes "concat" functions', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 45 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: 50 },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 },
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 },
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 }
    ]

    const expression = [
      '$select', [':city', ['$concat', ':name', ',', ':age']],
      ['$where', ['$ilike', ['$concat', ':name', ',', ':age'], '%oe%'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { city: 'Popayan', concat: 'John Doe,45' },
      { city: 'Bogota', concat: 'Ronald Roe,17' },
      { city: 'Popayan', concat: 'Michael Moe,26' }
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

    const expression = [
      '$select', [':city', ['$count', ':id']],
      ['$having', ['>', ['$count', ':id'], '1'],
        ['$group', [':city'],
          ['$where', ['$ilike', ':name', '%oe%'],
            ['$from', ['$as', 'Alpha', '@Alpha']]]]
      ]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { city: 'Popayan', count: 2 }
    ])
  })

  it('counts only non-null fields', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 45 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: 50 },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: null },
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: null },
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 }
    ]

    const expression = [
      '$select', [':city', ['$count', ':age']],
      ['$group', [':city'],
        ['$where', ['$ilike', ':name', '%oe%'],
          ['$from', ['$as', 'Alpha', '@Alpha']]]]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { city: 'Popayan', count: 1 },
      { city: 'Bogota', count: 0 }
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

    const expression = [
      '$join', ['$as', 'Beta', '@Beta'],
      ['=', 'Alpha:id', 'Beta:alphaId'],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha, Beta } })

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

  it('processes "leftJoin" clauses', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe' },
      { id: 'A002', name: 'Donald Duck' },
      { id: 'A003', name: 'Ronald Roe' }
    ]
    const Beta = [
      { id: 'B001', alphaId: null },
      { id: 'B002', alphaId: 'A001' },
      { id: 'B003', alphaId: null },
      { id: 'B004', alphaId: 'A003' },
      { id: 'B005', alphaId: 'A002' }
    ]

    const expression = [
      '$leftJoin', ['$as', 'Alpha', '@Alpha'],
      ['=', 'Beta:alphaId', 'Alpha:id'],
      ['$from', ['$as', 'Beta', '@Beta']]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha, Beta } })

    expect(expanded).toEqual([
      {
        Alpha: null,
        Beta: { id: 'B001', alphaId: null }
      },
      {
        Alpha: { id: 'A001', name: 'John Doe' },
        Beta: { id: 'B002', alphaId: 'A001' }
      },
      {
        Alpha: null,
        Beta: { id: 'B003', alphaId: null }
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

    const expression = [
      '$select', [':id', ':name', ':city', ':age'],
      ['$order', [{ ':city': '$desc' }, ':age'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha } })

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

    let expression = [
      '$select', [':id', ':name', ':city', ':age'],
      ['$limit', { offset: 1, limit: 2 },
        ['$order', [{ ':city': '$desc' }, ':age'],
          ['$from', ['$as', 'Alpha', '@Alpha']]]]
    ]
    let expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 },
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 45 }
    ])

    expression = [
      '$select', [':id', ':name', ':city', ':age'],
      ['$limit', 1,
        ['$order', [{ ':city': '$desc' }, ':age'],
          ['$from', ['$as', 'Alpha', '@Alpha']]]]
    ]
    expanded = await parser.parse(expression, { '@': { Alpha } })
    expect(expanded).toEqual([
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 }
    ])

    expression = [
      '$select', [':id', ':name', ':city', ':age'],
      ['$limit', { limit: 1 },
        ['$order', [{ ':city': '$desc' }, ':age'],
          ['$from', ['$as', 'Alpha', '@Alpha']]]]
    ]
    expanded = await parser.parse(expression, { '@': { Alpha } })
    expect(expanded).toEqual([
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 }
    ])

    expression = [
      '$select', [':id', ':name', ':city', ':age'],
      ['$limit', { offset: 4 },
        ['$order', [{ ':city': '$desc' }, ':age'],
          ['$from', ['$as', 'Alpha', '@Alpha']]]]
    ]
    expanded = await parser.parse(expression, { '@': { Alpha } })
    expect(expanded).toEqual([
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 }
    ])
  })

  it('implements multiple aggregate functions', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 47 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: null },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 },
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 },
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 },
      { id: 'A006', name: 'Stephen Cane', city: 'Bogota', age: 37 },
      { id: 'A007', name: 'Martin Swift', city: 'Bogota', age: 24 },
      { id: 'A008', name: 'Martin Swift', city: 'Bogota', age: 24 }
    ]

    const expression = [
      '$select', [':city', ['$count', ':id'],
        ['$sum', ':age'], ['$avg', ':age'],
        ['$min', ':age'], ['$max', ':age']],
      ['$group', [':city'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      {
        city: 'Popayan',
        count: 3,
        sum: 105,
        avg: 35,
        min: 26,
        max: 47
      },
      {
        city: 'Cali',
        count: 1,
        sum: 0,
        avg: NaN,
        min: Infinity,
        max: -Infinity
      },
      {
        city: 'Bogota',
        count: 4,
        sum: 102,
        avg: 25.5,
        min: 17,
        max: 37
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

    const expression = [
      '$select', [':*', ['$count', ':*']],
      ['$order', [':region', ':city'],
        ['$group', [':region', ':city'],
          ['$from', ['$as', 'Alpha', '@Alpha']]]]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { region: 'Center', city: 'Bogota', count: 1 },
      { region: 'South', city: 'Cali', count: 1 },
      { region: 'South', city: 'Popayan', count: 3 }
    ])
  })

  it('supports "as" clauses inside "select"', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 47 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: 50 },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 }
    ]

    const expression = [
      '$select', [
        ['$as', 'alphaCity', ':city'],
        ['$as', 'alphaMaxAge', ['$max', 'Alpha:age']],
        ['$as', 'alphaCount', ['$count', '*']]
      ],
      ['$group', [':city'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { alphaCity: 'Popayan', alphaMaxAge: 47, alphaCount: 1 },
      { alphaCity: 'Cali', alphaMaxAge: 50, alphaCount: 1 },
      { alphaCity: 'Bogota', alphaMaxAge: 17, alphaCount: 1 }
    ])
  })

  it('implements multiple aggregate functions without groups', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 50 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: null },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 },
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 },
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 },
      { id: 'A006', name: 'Stephen Cane', city: 'Bogota', age: 37 },
      { id: 'A007', name: 'Martin Swift', city: 'Bogota', age: 24 },
      { id: 'A008', name: 'Martin Swift', city: 'Bogota', age: 24 }
    ]

    const expression = [
      '$select', [['$count', ':*'],
        ['$sum', ':age'], ['$avg', ':age'],
        ['$min', ':age'], ['$max', ':age']
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      {
        count: 8,
        sum: 210,
        avg: 30,
        min: 17,
        max: 50
      }
    ])
  })

  it('implements aggregate functions with truthy conditions', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 50 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: null },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 },
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 },
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 },
      { id: 'A006', name: 'Stephen Cane', city: 'Bogota', age: 37 },
      { id: 'A007', name: 'Martin Swift', city: 'Bogota', age: 24 },
      { id: 'A008', name: 'Martin Swift', city: 'Bogota', age: 24 }
    ]

    const expression = [
      '$select', [['$count', ':*'],
        ['$sum', ':age'], ['$avg', ':age'],
        ['$min', ':age'], ['$max', ':age']
      ], ['$where', ['=', 1, 1],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      {
        count: 8,
        sum: 210,
        avg: 30,
        min: 17,
        max: 50
      }
    ])
  })

  it('processes "union" clauses', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 45 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: 50 },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 },
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 },
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 }
    ]

    const expression = [
      '$union',
      [
        '$select', [':city', ['$count', ':id']],
        ['$having', ['>', ['$count', ':id'], '1'],
          ['$group', [':city'],
            ['$where', ['$ilike', ':name', '%oe%'],
              ['$from', ['$as', 'Alpha', '@Alpha']]]]
        ]
      ],
      [
        '$select', [':city', ['$count', ':id']],
        ['$group', [':city'],
          ['$where', ['$ilike', ':name', '%al%'],
            ['$from', ['$as', 'Alpha', '@Alpha']]]]
      ]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { city: 'Popayan', count: 2 },
      { city: 'Cali', count: 1 },
      { city: 'Bogota', count: 1 }
    ])
  })

  it('processes "union" clauses of a single argument', async () => {
    const Alpha = [
      { id: 'A001', name: 'John Doe', city: 'Popayan', age: 45 },
      { id: 'A002', name: 'Donald Duck', city: 'Cali', age: 50 },
      { id: 'A003', name: 'Ronald Roe', city: 'Bogota', age: 17 },
      { id: 'A004', name: 'Michael Moe', city: 'Popayan', age: 26 },
      { id: 'A005', name: 'Freddy Foo', city: 'Popayan', age: 32 }
    ]

    const expression = [
      '$union',
      [
        '$select', [':city', ['$count', ':id']],
        ['$group', [':city'],
          ['$where', ['$ilike', ':name', '%al%'],
            ['$from', ['$as', 'Alpha', '@Alpha']]]]
      ]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { city: 'Cali', count: 1 },
      { city: 'Bogota', count: 1 }
    ])
  })

  it('handles arithmetic operations in select statements', async () => {
    const Gamma = [
      { id: 'G001', accountId: 'A001', debit: 5_000, credit: 0 },
      { id: 'G002', accountId: 'A001', debit: 0, credit: 1_000 },
      { id: 'G003', accountId: 'A001', debit: 2_000, credit: 0 }
    ]

    const expression = [
      '$select', [':id',
        ['$as', 'balance', ['-', ':debit', ':credit']],
        ['$as', 'total', ['+', ':debit', ':credit']],
        ['$as', 'divide', ['/', ':debit', 1]],
        ['$as', 'multiply', ['*', ':credit', 1]]
      ],
      ['$from', ['$as', 'Gamma', '@Gamma']]
    ]
    const expanded = await parser.parse(expression, { '@': { Gamma } })

    expect(expanded).toEqual([
      { id: 'G001', balance: 5_000, total: 5000, divide: 5_000, multiply: 0 },
      { id: 'G002', balance: -1_000, total: 1000, divide: 0, multiply: 1_000 },
      { id: 'G003', balance: 2_000, total: 2000, divide: 2_000, multiply: 0 }
    ])
  })

  it('handles arithmetic operations with groupings', async () => {
    const Gamma = [
      { id: 'G001', accountId: 'A001', debit: 5_000, credit: 0 },
      { id: 'G002', accountId: 'A001', debit: 0, credit: 1_000 },
      { id: 'G003', accountId: 'A001', debit: 2_000, credit: 0 },
      { id: 'G004', accountId: 'A002', debit: 1_000, credit: 0 },
      { id: 'G005', accountId: 'A002', debit: 0, credit: 1_200 }
    ]

    const expression = [
      '$select', [
        ':accountId',
        ['$as', 'balance', ['-',
          ['$sum', 'Gamma:debit'],
          ['$sum', 'Gamma:credit']]]
      ],
      ['$group', ['Gamma:accountId'],
        ['$from', ['$as', 'Gamma', '@Gamma']]]
    ]
    const expression2 = [
      '$select', [
        ':accountId'
        // ['$as', 'balance', ['-', 'Gamma:debit', 'Gamma:credit']]
      ],
      ['$group', ['Gamma:accountId'],
        ['$from', ['$as', 'Gamma', '@Gamma']]
      ]
    ]
    console.log('TEST>>>>')
    const expanded = await parser.parse(expression, { '@': { Gamma } })

    console.log({ expanded })

    expect(expanded).toEqual([
      { accountId: 'A001', balance: 6_000 },
      { accountId: 'A002', balance: -200 }
    ])
  })
})
