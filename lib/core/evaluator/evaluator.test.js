import { describe, expect, it, beforeEach } from '@jest/globals'
import { baseOperators } from './operators.js'
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

  it('evaluates scalars', async () => {
    const environment = new Environment({ ...baseOperators })
    expect(await evaluator.evaluate(5, environment)).toEqual(5)
    expect(await evaluator.evaluate('hello', environment)).toEqual('hello')
    expect(await evaluator.evaluate(true, environment)).toEqual(true)
  })

  it('supports object operators', async () => {
    const environment = new Environment({ ...baseOperators })
    const scenarios = [
      { expression: ['_get', 'age', { age: 34 }], result: 34 },
      { expression: ['_get', 'height', { age: 34 }, 177], result: 177 }
    ]

    for (const scenario of scenarios) {
      const result = await evaluator.evaluate(
        scenario.expression, environment)
      expect(result).toEqual(scenario.result)
    }
  })

  it('supports collection operators', async () => {
    const environment = new Environment({ ...baseOperators })
    const scenarios = [
      {
        expression: ['_map', 'id', {
          '': [{ id: 1 }, { id: 2 }, { id: 3 }]
        }],
        result: [1, 2, 3]
      },
      {
        expression: ['_unique', { '': [1, 2, 3, 3, 3] }],
        result: [1, 2, 3]
      },
      {
        expression: ['_size', { '': [1, 2, 3, 3, 3] }],
        result: 5
      }
    ]

    for (const scenario of scenarios) {
      const result = await evaluator.evaluate(
        scenario.expression, environment)
      expect(result).toEqual(scenario.result)
    }
  })

  it('formats strings using sequential directives', async () => {
    const environment = new Environment({ ...baseOperators })

    let expression = [
      '_format',
      'Hello: "$1" "$2" "$1"',
      'Happy',
      'World'
    ]
    let result = await evaluator.evaluate(expression, environment)
    expect(result).toEqual('Hello: "Happy" "World" "Happy"')

    expression = [
      '_format',
      { data: ['_map', 'id', '$1'] },
      { '': [{ id: 'I001' }, { id: 'I002' }, { id: 'I003' }] }
    ]
    result = await evaluator.evaluate(expression, environment)
    expect(result).toEqual(JSON.stringify({
      data: ['_map', 'id', [{ id: 'I001' }, { id: 'I002' }, { id: 'I003' }]]
    }))
  })

  it('generates a list by evaluating its arguments', async () => {
    const environment = new Environment({
      ...baseOperators,
      '@': {
        user: {
          id: 'U001',
          name: 'John Doe'
        }
      }
    })
    const expression = [
      '_list', ['_get', 'id', '@user'], ['_get', 'name', '@user']
    ]

    const result = await evaluator.evaluate(expression, environment)

    expect(result).toEqual(['U001', 'John Doe'])
  })

  it('supports chained collection operators', async () => {
    const environment = new Environment({ ...baseOperators })
    const scenarios = [
      {
        expression: ['_unique', ['_map', 'id', {
          '': [{ id: 1 }, { id: 2 }, { id: 3 }]
        }]],
        result: [1, 2, 3]
      },
      {
        expression: ['_size', ['_unique', ['_map', 'id', {
          '': [{ id: 3 }, { id: 3 }, { id: 3 }]
        }]]],
        result: 1
      },
      {
        expression: ['_size', ['_unique', ['_map', 'id',
          { '': [{ id: 3 }, { id: 3 }, { id: 3 }] }]]],
        result: 1
      }
    ]

    for (const scenario of scenarios) {
      const result = await evaluator.evaluate(
        scenario.expression, environment)
      expect(result).toEqual(scenario.result)
    }
  })

  it('defines new namespaced variables', async () => {
    const environment = new Environment({ ...baseOperators })

    const expression = [
      '_list',
      ['_map', 'key', ['_get', 'data',
        ['_define', { '': '#variable' }, {
          data: [{ key: 1 }, { key: 2 }, { key: 3 }]
        }]
      ]],
      ['_get', 'data', '#variable']
    ]
    const result = await evaluator.evaluate(expression, environment)
    expect(result).toEqual([
      [1, 2, 3], [{ key: 1 }, { key: 2 }, { key: 3 }]
    ])
  })

  it('fetches remote resources serializing its payload to json', async () => {
    const originalFetch = globalThis.fetch
    const mockFetch = async (endpoint, options) => {
      mockFetch._endpoint = endpoint
      mockFetch._options = options
      return {
        async json () {
          return {
            data: [
              { id: 'O001', name: 'One' },
              { id: 'O002', name: 'Two' },
              { id: 'O003', name: 'Three' }
            ]
          }
        }
      }
    }
    globalThis.fetch = mockFetch

    const authorization = 'TEST_JWT_TOKEN'
    const expression = [
      '_fetch', '@Endpoint', { headers: { authorization } },
      ['_format', {
        data: [
          '$select', ['*'],
          ['$where', ['$in', ':id', { '': '$1' }],
            ['$from', ['$as', 'Model', '@Model']]]
        ]
      }, { '': ['I001', 'I002', 'I003'] }]
    ]
    const environment = new Environment({
      ...baseOperators,
      '@': { Endpoint: 'https://server.example/seql' }
    })
    const result = await evaluator.evaluate(expression, environment)

    expect(mockFetch._endpoint).toEqual(
      'https://server.example/seql')
    expect(mockFetch._options).toEqual({
      method: 'POST',
      headers: {
        authorization: 'TEST_JWT_TOKEN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: [
          '$select', ['*'],
          ['$where', ['$in', ':id', { '': ['I001', 'I002', 'I003'] }],
            ['$from', ['$as', 'Model', '@Model']]]
        ]
      })
    })
    expect(result).toEqual({
      data: [
        { id: 'O001', name: 'One' },
        { id: 'O002', name: 'Two' },
        { id: 'O003', name: 'Three' }
      ]
    })
    globalThis.fetch = originalFetch
  })

  it('fetches remote resources with default options if null', async () => {
    const originalFetch = globalThis.fetch
    const mockFetch = async (endpoint, options) => {
      mockFetch._endpoint = endpoint
      mockFetch._options = options
      return {
        async json () {
          return {
            data: [
              { id: 'O001', name: 'One' },
              { id: 'O002', name: 'Two' },
              { id: 'O003', name: 'Three' }
            ]
          }
        }
      }
    }
    globalThis.fetch = mockFetch

    const expression = [
      '_fetch', '@Endpoint', null,
      ['_format', {
        data: [
          '$select', ['*'],
          ['$where', ['$in', ':id', { '': '$1' }],
            ['$from', ['$as', 'Model', '@Model']]]
        ]
      }, { '': ['I001', 'I002', 'I003'] }]
    ]
    const environment = new Environment({
      ...baseOperators,
      '@': { Endpoint: 'https://server.example/seql' }
    })
    const result = await evaluator.evaluate(expression, environment)

    expect(mockFetch._endpoint).toEqual(
      'https://server.example/seql')
    expect(mockFetch._options).toEqual({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: [
          '$select', ['*'],
          ['$where', ['$in', ':id', { '': ['I001', 'I002', 'I003'] }],
            ['$from', ['$as', 'Model', '@Model']]]
        ]
      })
    })
    expect(result).toEqual({
      data: [
        { id: 'O001', name: 'One' },
        { id: 'O002', name: 'Two' },
        { id: 'O003', name: 'Three' }
      ]
    })
    globalThis.fetch = originalFetch
  })
})
