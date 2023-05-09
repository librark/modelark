import { describe, expect, it, beforeEach } from '@jest/globals'
import { Environment } from './environment/index.js'
import { SqlEvaluator } from './sql.evaluator.js'

describe('SqlEvaluator', () => {
  let evaluator = null
  beforeEach(() => {
    evaluator = new SqlEvaluator()
  })

  it('can be instantiated', () => {
    expect(evaluator).toBeTruthy()
  })

  it('processes "from" clauses', async () => {
    const Alpha = 'Alpha'
    const Beta = 'Beta'

    const environment = new Environment({ '@': { Alpha, Beta } })

    const expression = ['$from', ['$as', 'Beta', '@Beta']]
    const result = await evaluator.evaluate(expression, environment)

    expect(result.statement).toEqual('FROM "Beta" AS "Beta"')
    expect(result.values).toEqual([])
  })

  it('processes "where" clauses', async () => {
    const Alpha = 'Alpha'
    const Beta = 'Beta'
    const environment = new Environment({ '@': { Alpha, Beta } })

    const expression = [
      '$where',

      ['$ilike', ':name', '%oe%'],

      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]
    const result = await evaluator.evaluate(expression, environment)

    expect(result.statement).toEqual(
      'FROM "Alpha" AS "Alpha" WHERE "name" ILIKE !#!')
    expect(result.values).toEqual(['%oe%'])
  })

  it('processes "select" clauses', async () => {
    const Alpha = 'Alpha'
    const environment = new Environment({ '@': { Alpha } })

    const expression = [
      '$select', [':name', ':age'],

      ['$where', ['$ilike', ':name', '%uc%'],

        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]

    const result = await evaluator.evaluate(expression, environment)

    expect(result.statement).toEqual(
      'SELECT "@column::name", "@column::age" FROM "Alpha" AS "Alpha" ' +
      'WHERE "name" ILIKE !#!')
    expect(result.values).toEqual(['%uc%'])
  })

  it('processes "group" clauses', async () => {
    const Alpha = 'Alpha'
    const environment = new Environment({ '@': { Alpha } })

    const expression = [
      '$group', [':city'],

      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const result = await evaluator.evaluate(expression, environment)

    expect(result.statement).toEqual(
      'FROM "Alpha" AS "Alpha" GROUP BY "@column::city"')
    expect(result.values).toEqual([])
  })
})
