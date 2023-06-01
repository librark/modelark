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

    const expression = ['_fetch', '@Endpoint', {
      body: JSON.stringify({
        data: [
          '$select', ['*'],
          ['$from', ['$as', 'Model', '@Model']]
        ]
      })
    }]
    const environment = new Environment({
      ...baseOperators,
      '@': { Endpoint: 'https://server.example/seql' }
    })
    const result = await evaluator.evaluate(expression, environment)

    expect(mockFetch._endpoint).toEqual(
      'https://server.example/seql')
    expect(mockFetch._options).toEqual({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          '$select', ['*'],
          ['$from', ['$as', 'Model', '@Model']]
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
