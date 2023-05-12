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
      { expression: ['_get', { age: 34 }, 'age'], result: 34 },
      { expression: ['_get', { age: 34 }, 'height', 177], result: 177 }
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

  it('can await pending promises in parallel', async () => {
    const first = async () => 1
    const second = async () => 2
    const third = async () => 3

    const expression = ['_size', ['_wait', first(), second(), third()]]

    const environment = new Environment({ ...baseOperators })
    const result = await evaluator.evaluate(expression, environment)

    expect(result).toEqual(3)
  })
})
