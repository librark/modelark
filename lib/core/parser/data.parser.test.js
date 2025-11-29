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
      { expression: ['<=', ':field', 3, 6], object: { field: 3 } },
      { expression: ['$isnull', ':field'], object: { field: null } }
    ]

    for (const scenario of scenarios) {
      const result = await parser.parse(
        scenario.expression, { ':': scenario.object })
      expect(result).toBe(true)
    }
  })

  it('compares date object against their string representation', async () => {
    const scenarios = [
      {
        object: { date: new Date('2024-10-01') },
        expression: ['=', ':date', '2024-10-01']
      },
      {
        object: { date: new Date('2024-10-01') },
        expression: ['!=', ':date', '2024-10-02']
      },
      {
        object: { date: new Date('2024-10-01') },
        expression: ['>=', ':date', '2024-08-01']
      },
      {
        object: { date: new Date('2024-10-01') },
        expression: ['>', ':date', '2024-08-01']
      },
      {
        object: { date: new Date('2024-10-01') },
        expression: ['<=', ':date', '2024-12-01']
      },
      {
        object: { date: new Date('2024-10-01') },
        expression: ['<', ':date', '2024-12-01']
      }
    ]

    for (const scenario of scenarios) {
      const result = await parser.parse(
        scenario.expression, { ':': scenario.object })
      expect(result).toBe(true)
    }
  })

  it('extracts datetime components from the given date', async () => {
    const scenarios = [
      {
        object: { start: new Date('2025-01-01'), end: new Date('2025-03-01') },
        expression: ['$extract', 'month', ['-', ':end', ':start']],
        result: 2
      },
      {
        object: { start: new Date('2025-01-01'), end: new Date('2026-03-01') },
        expression: ['$extract', 'month', ['-', ':end', ':start']],
        result: 2 // To match SQL behaviour.
      },
      {
        object: { start: new Date('2025-01-01'), end: new Date('2026-03-01') },
        expression: ['$extract', 'year', ['-', ':end', ':start']],
        result: 0 // To match SQL behaviour.
      },
      {
        object: { start: new Date('2025-01-01'), end: new Date('2025-03-01') },
        expression: ['$extract', 'epoch', ['-', ':end', ':start']],
        result: 5_097_600
      },
      {
        object: { date: new Date('2025-03-15') },
        expression: ['$extract', 'epoch', ':date'],
        result: 1_741_996_800
      },
      {
        object: { date: new Date('2025-03-15') },
        expression: ['$extract', 'year', ':date'],
        result: 2025
      },
      {
        object: { date: new Date('2025-03-15') },
        expression: ['$extract', 'month', ':date'],
        result: 3
      },
      {
        object: { start: new Date('2025-01-01'), end: new Date('2026-03-01') },
        expression: ['$extract', 'day', ['-', ':end', ':start']],
        result: 424
      },
      {
        object: { date: new Date('2025-01-15') },
        expression: ['$extract', 'day', ':date'],
        result: 15
      }
    ]

    for (const { expression, object, result } of scenarios) {
      const extracted = await parser.parse(expression, { ':': object })
      expect(extracted).toEqual(result)
    }

    await expect(parser.parse(['$extract', 'julian', ':date'],
      { ':': { date: new Date() } })).rejects.toThrow(
      'Field "julian" is not implemented by $extract.')
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
    const expanded = await parser.parse(expression, { '@': { Gamma } })

    expect(expanded).toEqual([
      { accountId: 'A001', balance: 6_000 },
      { accountId: 'A002', balance: -200 }
    ])
  })

  it('processes subqueries within $from clauses', async () => {
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
      '$select', [['$sum', ':sum']],
      ['$from', ['$as', 'Subquery',
        ['$select', [':city', ['$count', ':id'], ['$sum', ':age']],
          ['$group', [':city'],
            ['$from', ['$as', 'Alpha', '@Alpha']]]]]]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { sum: 207 }
    ])
  })

  it('filters the values used on aggregations', async () => {
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
      '$select', [':city',
        ['$count', ':id'],
        ['$avg', ':age'],
        ['$as', 'avgOver30', ['$avg', ['$filter', ':age', ['>', ':age', 30]]]]
      ],
      ['$group', [':city'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      {
        city: 'Popayan',
        count: 3,
        avg: 35,
        avgOver30: 39.5
      },
      {
        city: 'Cali',
        count: 1,
        avg: NaN,
        avgOver30: NaN
      },
      {
        city: 'Bogota',
        count: 4,
        avg: 25.5,
        avgOver30: 37
      }
    ])
  })

  it('allows using date objects directly in "select" clauses', async () => {
    const Alpha = [
      { id: 'A001', date: new Date('2025-01-01'), name: 'John Doe', age: 45 },
      { id: 'A002', date: new Date('2025-02-01'), name: 'Donald Duck', age: 50 },
      { id: 'A003', date: new Date('2025-03-01'), name: 'Ronald Roe', age: 17 }
    ]

    const expression = [
      '$select', [':id', ':date', ':name', ':age'],

      ['$where', ['>=', ':date', new Date('2025-02-01')],

        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A002', date: new Date('2025-02-01'), name: 'Donald Duck', age: 50 },
      { id: 'A003', date: new Date('2025-03-01'), name: 'Ronald Roe', age: 17 }
    ])
  })

  it('retrieves all values prefixed by their model when joining', async () => {
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
      '$select', ['Alpha:*', 'Beta:*'],
      ['$join', ['$as', 'Beta', '@Beta'],
        ['=', 'Alpha:id', 'Beta:alphaId'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const expanded = await parser.parse(expression, { '@': { Alpha, Beta } })

    expect(expanded).toEqual([
      { 'Alpha:id': 'A001', 'Alpha:name': 'John Doe', 'Beta:id': 'B001', 'Beta:alphaId': 'A001' },
      { 'Alpha:id': 'A001', 'Alpha:name': 'John Doe', 'Beta:id': 'B002', 'Beta:alphaId': 'A001' },
      { 'Alpha:id': 'A003', 'Alpha:name': 'Ronald Roe', 'Beta:id': 'B003', 'Beta:alphaId': 'A003' },
      { 'Alpha:id': 'A003', 'Alpha:name': 'Ronald Roe', 'Beta:id': 'B004', 'Beta:alphaId': 'A003' },
      { 'Alpha:id': 'A002', 'Alpha:name': 'Donald Duck', 'Beta:id': 'B005', 'Beta:alphaId': 'A002' }
    ])
  })

  it('computes row numbers over window partitions', async () => {
    const Alpha = [
      { id: 'A001', city: 'Popayan', age: 45 },
      { id: 'A002', city: 'Cali', age: 50 },
      { id: 'A003', city: 'Popayan', age: 26 },
      { id: 'A004', city: 'Popayan', age: 32 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'rowNumber', ['$over', ['$row_number'], {
          partition: [':city'],
          order: [':age']
        }]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A001', rowNumber: 3 },
      { id: 'A002', rowNumber: 1 },
      { id: 'A003', rowNumber: 1 },
      { id: 'A004', rowNumber: 2 }
    ])
  })

  it('computes running totals using window frames', async () => {
    const Ledger = [
      { id: 'L001', account: 'A', amount: 100 },
      { id: 'L002', account: 'A', amount: 50 },
      { id: 'L003', account: 'A', amount: -20 },
      { id: 'L004', account: 'B', amount: 10 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'runningTotal', ['$over', ['$sum', ':amount'], {
          partition: [':account'],
          order: [':id']
        }]]
      ],
      ['$from', ['$as', 'Ledger', '@Ledger']]
    ]

    const expanded = await parser.parse(expression, { '@': { Ledger } })

    expect(expanded).toEqual([
      { id: 'L001', runningTotal: 100 },
      { id: 'L002', runningTotal: 150 },
      { id: 'L003', runningTotal: 130 },
      { id: 'L004', runningTotal: 10 }
    ])
  })

  it('supports custom window frames with preceding offsets', async () => {
    const Ledger = [
      { id: 'L001', account: 'A', amount: 100 },
      { id: 'L002', account: 'A', amount: 50 },
      { id: 'L003', account: 'A', amount: -20 },
      { id: 'L004', account: 'B', amount: 10 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'movingSum', ['$over', ['$sum', ':amount'], {
          partition: [':account'],
          order: [':id'],
          frame: {
            start: { type: 'preceding', offset: 1 },
            end: { type: 'current' }
          }
        }]]
      ],
      ['$from', ['$as', 'Ledger', '@Ledger']]
    ]

    const expanded = await parser.parse(expression, { '@': { Ledger } })

    expect(expanded).toEqual([
      { id: 'L001', movingSum: 100 },
      { id: 'L002', movingSum: 150 },
      { id: 'L003', movingSum: 30 },
      { id: 'L004', movingSum: 10 }
    ])
  })

  it('computes ranking functions over ordered windows', async () => {
    const Scores = [
      { id: 'S001', group: 'G', score: 100 },
      { id: 'S002', group: 'G', score: 100 },
      { id: 'S003', group: 'G', score: 90 },
      { id: 'S004', group: 'G', score: 80 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'rank', ['$over', ['$rank'], {
          partition: [':group'],
          order: [{ ':score': '$desc' }]
        }]],
        ['$as', 'denseRank', ['$over', ['$dense_rank'], {
          partition: [':group'],
          order: [{ ':score': '$desc' }]
        }]]
      ],
      ['$from', ['$as', 'Scores', '@Scores']]
    ]

    const expanded = await parser.parse(expression, { '@': { Scores } })

    expect(expanded).toEqual([
      { id: 'S001', rank: 1, denseRank: 1 },
      { id: 'S002', rank: 1, denseRank: 1 },
      { id: 'S003', rank: 3, denseRank: 2 },
      { id: 'S004', rank: 4, denseRank: 3 }
    ])
  })

  it('supports lag and lead window offsets', async () => {
    const Ledger = [
      { id: 'L001', account: 'A', amount: 100 },
      { id: 'L002', account: 'A', amount: 50 },
      { id: 'L003', account: 'A', amount: -20 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'lag', ['$over', ['$lag', ':amount', 1, 0], {
          partition: [':account'],
          order: [':id']
        }]],
        ['$as', 'lead', ['$over', ['$lead', ':amount', 1, 0], {
          partition: [':account'],
          order: [':id']
        }]]
      ],
      ['$from', ['$as', 'Ledger', '@Ledger']]
    ]

    const expanded = await parser.parse(expression, { '@': { Ledger } })

    expect(expanded).toEqual([
      { id: 'L001', lag: 0, lead: 50 },
      { id: 'L002', lag: 100, lead: -20 },
      { id: 'L003', lag: 50, lead: 0 }
    ])
  })

  it('uses numeric frame offsets for preceding/following bounds', async () => {
    const Ledger = [
      { id: 'L001', amount: 1 },
      { id: 'L002', amount: 2 },
      { id: 'L003', amount: 3 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'windowSum', ['$over', ['$sum', ':amount'], {
          order: [':id'],
          frame: { start: -1, end: 1 }
        }]]
      ],
      ['$from', ['$as', 'Ledger', '@Ledger']]
    ]

    const expanded = await parser.parse(expression, { '@': { Ledger } })

    expect(expanded).toEqual([
      { id: 'L001', windowSum: 3 },
      { id: 'L002', windowSum: 6 },
      { id: 'L003', windowSum: 5 }
    ])
  })

  it('accepts string frame bounds for unbounded/current rows', async () => {
    const Ledger = [
      { id: 'L001', amount: 1 },
      { id: 'L002', amount: 2 },
      { id: 'L003', amount: 3 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'cumulative', ['$over', ['$sum', ':amount'], {
          order: [':id'],
          frame: { start: 'unbounded', end: 'current' }
        }]]
      ],
      ['$from', ['$as', 'Ledger', '@Ledger']]
    ]

    const expanded = await parser.parse(expression, { '@': { Ledger } })

    expect(expanded).toEqual([
      { id: 'L001', cumulative: 1 },
      { id: 'L002', cumulative: 3 },
      { id: 'L003', cumulative: 6 }
    ])
  })

  it('falls back to current row when frame bound type is unknown', async () => {
    const Ledger = [
      { id: 'L001', amount: 1 },
      { id: 'L002', amount: 2 },
      { id: 'L003', amount: 3 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'partial', ['$over', ['$sum', ':amount'], {
          order: [':id'],
          frame: { start: { type: 'preceding', offset: 1 }, end: { type: 'unknown' } }
        }]]
      ],
      ['$from', ['$as', 'Ledger', '@Ledger']]
    ]

    const expanded = await parser.parse(expression, { '@': { Ledger } })

    expect(expanded).toEqual([
      { id: 'L001', partial: 1 },
      { id: 'L002', partial: 3 },
      { id: 'L003', partial: 5 }
    ])
  })

  it('orders window frames by multiple fields', async () => {
    const Alpha = [
      { id: 'A001', city: 'B', age: 30 },
      { id: 'A002', city: 'A', age: 25 },
      { id: 'A003', city: 'B', age: 20 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'rowNumber', ['$over', ['$row_number'], {
          order: [':city', { ':age': '$desc' }]
        }]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A001', rowNumber: 2 },
      { id: 'A002', rowNumber: 1 },
      { id: 'A003', rowNumber: 3 }
    ])
  })

  it('treats unknown string bounds as current row for window frames', async () => {
    const Ledger = [
      { id: 'L001', amount: 1 },
      { id: 'L002', amount: 2 },
      { id: 'L003', amount: 3 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'self', ['$over', ['$sum', ':amount'], {
          order: [':id'],
          frame: { start: 'custom', end: 'custom' }
        }]]
      ],
      ['$from', ['$as', 'Ledger', '@Ledger']]
    ]

    const expanded = await parser.parse(expression, { '@': { Ledger } })

    expect(expanded).toEqual([
      { id: 'L001', self: 1 },
      { id: 'L002', self: 2 },
      { id: 'L003', self: 3 }
    ])
  })

  it('returns empty frames when the start bound is ahead of the end bound', async () => {
    const Ledger = [
      { id: 'L001', amount: 1 },
      { id: 'L002', amount: 2 },
      { id: 'L003', amount: 3 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'sum', ['$over', ['$sum', ':amount'], {
          order: [':id'],
          frame: { start: { type: 'following', offset: 2 }, end: { type: 'preceding', offset: 1 } }
        }]],
        ['$as', 'avg', ['$over', ['$avg', ':amount'], {
          order: [':id'],
          frame: { start: { type: 'following', offset: 2 }, end: { type: 'preceding', offset: 1 } }
        }]]
      ],
      ['$from', ['$as', 'Ledger', '@Ledger']]
    ]

    const expanded = await parser.parse(expression, { '@': { Ledger } })

    expect(expanded).toEqual([
      { id: 'L001', sum: 0, avg: NaN },
      { id: 'L002', sum: 0, avg: NaN },
      { id: 'L003', sum: 0, avg: NaN }
    ])
  })

  it('computes windowed maximum values', async () => {
    const Ledger = [
      { id: 'L001', amount: 1 },
      { id: 'L002', amount: 3 },
      { id: 'L003', amount: 2 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'maxAmount', ['$over', ['$max', ':amount'], {
          order: [':id'],
          frame: { start: 'unbounded', end: 'current' }
        }]]
      ],
      ['$from', ['$as', 'Ledger', '@Ledger']]
    ]

    const expanded = await parser.parse(expression, { '@': { Ledger } })

    expect(expanded).toEqual([
      { id: 'L001', maxAmount: 1 },
      { id: 'L002', maxAmount: 3 },
      { id: 'L003', maxAmount: 3 }
    ])
  })

  it('computes windowed min values', async () => {
    const Ledger = [
      { id: 'L001', amount: 3 },
      { id: 'L002', amount: 1 },
      { id: 'L003', amount: 2 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'minAmount', ['$over', ['$min', ':amount'], {
          order: [':id'],
          frame: { start: 'unbounded', end: 'current' }
        }]]
      ],
      ['$from', ['$as', 'Ledger', '@Ledger']]
    ]

    const expanded = await parser.parse(expression, { '@': { Ledger } })

    expect(expanded).toEqual([
      { id: 'L001', minAmount: 3 },
      { id: 'L002', minAmount: 1 },
      { id: 'L003', minAmount: 1 }
    ])
  })

  it('counts non-null values over windows', async () => {
    const Alpha = [
      { id: 'A001', amount: null },
      { id: 'A002', amount: 10 },
      { id: 'A003', amount: 5 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'count', ['$over', ['$count', ':*'], {
          order: [':id']
        }]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A001', count: 1 },
      { id: 'A002', count: 2 },
      { id: 'A003', count: 3 }
    ])
  })

  it('skips nulls while computing windowed minimum', async () => {
    const Alpha = [
      { id: 'A001', amount: null },
      { id: 'A002', amount: 10 },
      { id: 'A003', amount: 5 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'min', ['$over', ['$min', ':amount'], {
          order: [':id']
        }]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A001', min: Infinity },
      { id: 'A002', min: 10 },
      { id: 'A003', min: 5 }
    ])
  })

  it('computes rank and dense rank without ordering', async () => {
    const Alpha = [
      { id: 'A001' },
      { id: 'A002' }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'rank', ['$over', ['$rank']]],
        ['$as', 'denseRank', ['$over', ['$dense_rank']]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A001', rank: 1, denseRank: 1 },
      { id: 'A002', rank: 2, denseRank: 2 }
    ])
  })

  it('returns null when lag/lead lack defaults and no row exists', async () => {
    const Alpha = [
      { id: 'A001', amount: 10 },
      { id: 'A002', amount: 20 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'leadNoDefault', ['$over', ['$lead', ':amount'], {
          order: [':id']
        }]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A001', leadNoDefault: 20 },
      { id: 'A002', leadNoDefault: null }
    ])
  })

  it('supports lag with custom steps and defaults', async () => {
    const Alpha = [
      { id: 'A001', amount: 10 },
      { id: 'A002', amount: 20 },
      { id: 'A003', amount: 30 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'lag2', ['$over', ['$lag', ':amount', 2, -1], {
          order: [':id']
        }]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A001', lag2: -1 },
      { id: 'A002', lag2: -1 },
      { id: 'A003', lag2: 10 }
    ])
  })

  it('treats null lag steps as one by default', async () => {
    const Alpha = [
      { id: 'A001', amount: 10 },
      { id: 'A002', amount: 20 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'leadNullStep', ['$over', ['$lead', ':amount', null, -1], {
          order: [':id']
        }]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A001', leadNullStep: 20 },
      { id: 'A002', leadNullStep: -1 }
    ])
  })

  it('accepts string function identifiers in window definitions', async () => {
    const Alpha = [
      { id: 'A001' },
      { id: 'A002' }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'row', ['$over', '$row_number']]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A001', row: 1 },
      { id: 'A002', row: 2 }
    ])
  })

  it('treats null frame bounds as current row', async () => {
    const Alpha = [
      { id: 'A001', amount: 5 },
      { id: 'A002', amount: 6 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'currentSum', ['$over', ['$sum', ':amount'], {
          order: [':id'],
          frame: { start: null, end: null }
        }]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A001', currentSum: 5 },
      { id: 'A002', currentSum: 6 }
    ])
  })

  it('defaults missing start frame bound to unbounded when end is provided', async () => {
    const Alpha = [
      { id: 'A001', amount: 1 },
      { id: 'A002', amount: 2 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'total', ['$over', ['$sum', ':amount'], {
          order: [':id'],
          frame: { end: { type: 'current' } }
        }]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A001', total: 1 },
      { id: 'A002', total: 3 }
    ])
  })

  it('defaults missing end frame bound to current when only start is provided', async () => {
    const Alpha = [
      { id: 'A001', amount: 1 },
      { id: 'A002', amount: 2 },
      { id: 'A003', amount: 3 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'windowSum', ['$over', ['$sum', ':amount'], {
          order: [':id'],
          frame: { start: { type: 'preceding', offset: 1 } }
        }]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A001', windowSum: 1 },
      { id: 'A002', windowSum: 3 },
      { id: 'A003', windowSum: 5 }
    ])
  })

  it('supports unbounded following as end bound', async () => {
    const Alpha = [
      { id: 'A001', amount: 1 },
      { id: 'A002', amount: 2 },
      { id: 'A003', amount: 3 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'futureSum', ['$over', ['$sum', ':amount'], {
          order: [':id'],
          frame: { start: { type: 'current' }, end: { type: 'unbounded' } }
        }]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A001', futureSum: 6 },
      { id: 'A002', futureSum: 5 },
      { id: 'A003', futureSum: 3 }
    ])
  })

  it('treats empty frame bounds as current row', async () => {
    const Alpha = [
      { id: 'A001', amount: 1 },
      { id: 'A002', amount: 2 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'self', ['$over', ['$sum', ':amount'], {
          order: [':id'],
          frame: { start: {}, end: {} }
        }]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const expanded = await parser.parse(expression, { '@': { Alpha } })

    expect(expanded).toEqual([
      { id: 'A001', self: 1 },
      { id: 'A002', self: 2 }
    ])
  })

  it('throws when using window functions outside of select projections', async () => {
    await expect(parser.parse(['$over', ['$row_number']])).rejects.toThrow(
      '$over must be used inside a $select projection.')
  })

  it('defaults to unbounded frames when no ordering is provided', async () => {
    const Ledger = [
      { id: 'L001', account: 'A', amount: 100 },
      { id: 'L002', account: 'A', amount: 50 },
      { id: 'L003', account: 'A', amount: -20 },
      { id: 'L004', account: 'B', amount: 10 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'total', ['$over', ['$sum', ':amount'], {
          partition: [':account']
        }]]
      ],
      ['$from', ['$as', 'Ledger', '@Ledger']]
    ]

    const expanded = await parser.parse(expression, { '@': { Ledger } })

    expect(expanded).toEqual([
      { id: 'L001', total: 130 },
      { id: 'L002', total: 130 },
      { id: 'L003', total: 130 },
      { id: 'L004', total: 10 }
    ])
  })

  it('supports frames that look ahead using following bounds', async () => {
    const Ledger = [
      { id: 'L001', account: 'A', amount: 100 },
      { id: 'L002', account: 'A', amount: 50 },
      { id: 'L003', account: 'A', amount: -20 },
      { id: 'L004', account: 'B', amount: 10 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'futureSum', ['$over', ['$sum', ':amount'], {
          partition: [':account'],
          order: [':id'],
          frame: { start: { type: 'current' }, end: { type: 'following', offset: 1 } }
        }]]
      ],
      ['$from', ['$as', 'Ledger', '@Ledger']]
    ]

    const expanded = await parser.parse(expression, { '@': { Ledger } })

    expect(expanded).toEqual([
      { id: 'L001', futureSum: 150 },
      { id: 'L002', futureSum: 30 },
      { id: 'L003', futureSum: -20 },
      { id: 'L004', futureSum: 10 }
    ])
  })

  it('uses input order when no ordering is provided for lag/lead', async () => {
    const Ledger = [
      { id: 'L001', account: 'A', amount: 100 },
      { id: 'L002', account: 'A', amount: 50 },
      { id: 'L003', account: 'A', amount: -20 },
      { id: 'L004', account: 'B', amount: 10 }
    ]

    const expression = [
      '$select', [
        ':id',
        ['$as', 'previous', ['$over', ['$lag', ':amount'], {
          partition: [':account']
        }]]
      ],
      ['$from', ['$as', 'Ledger', '@Ledger']]
    ]

    const expanded = await parser.parse(expression, { '@': { Ledger } })

    expect(expanded).toEqual([
      { id: 'L001', previous: null },
      { id: 'L002', previous: 100 },
      { id: 'L003', previous: 50 },
      { id: 'L004', previous: null }
    ])
  })

  it('fails when invoking an unknown window function', async () => {
    const Alpha = [{ id: 'A001' }]
    const expression = [
      '$select', [
        ['$as', 'bad', ['$over', ['$unknown'], { partition: [':id'] }]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    await expect(parser.parse(expression, { '@': { Alpha } }))
      .rejects.toThrow('Window function "$unknown" is not implemented.')
  })
})
