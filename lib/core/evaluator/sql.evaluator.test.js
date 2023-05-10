import { describe, expect, it, beforeEach } from '@jest/globals'
import { Environment } from './environment/index.js'
import { SqlEvaluator } from './sql.evaluator.js'

describe('SqlEvaluator', () => {
  let evaluator = null
  beforeEach(() => {
    const tables = ['Alpha', 'Beta']
    evaluator = new SqlEvaluator({ tables })
  })

  it('can be instantiated', () => {
    expect(evaluator).toBeTruthy()
  })

  it('processes "from" clauses', async () => {
    const environment = new Environment()

    const expression = ['$from', ['$as', 'Beta', '@Beta']]
    const result = await evaluator.evaluate(expression, environment)

    expect(result.statement).toEqual('FROM "Beta" AS "Beta"')
    expect(result.values).toEqual([])
  })

  it('processes "where" clauses', async () => {
    const environment = new Environment()

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
    const environment = new Environment()

    const expression = [
      '$select', [':name', ':age'],

      ['$where', ['$ilike', ':name', '%uc%'],

        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]

    const result = await evaluator.evaluate(expression, environment)

    expect(result.statement).toEqual(
      'SELECT "name", "age" FROM "Alpha" AS "Alpha" ' +
      'WHERE "name" ILIKE !#!')
    expect(result.values).toEqual(['%uc%'])
  })

  it('processes "group" clauses', async () => {
    const environment = new Environment()

    const expression = [
      '$group', [':city'],

      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const result = await evaluator.evaluate(expression, environment)

    expect(result.statement).toEqual(
      'FROM "Alpha" AS "Alpha" GROUP BY "city"')
    expect(result.values).toEqual([])
  })

  it('processes "having" clauses', async () => {
    const environment = new Environment()

    const expression = [
      '$having', ['>', ['$count', '*'], 1],
      ['$group', [':city'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const result = await evaluator.evaluate(expression, environment)

    expect(result.statement).toEqual(
      'FROM "Alpha" AS "Alpha" ' +
      'GROUP BY "city" ' +
      'HAVING COUNT(*) > !#!')
    expect(result.values).toEqual([1])
  })

  it('processes aggregate functions in "select" clauses', async () => {
    const environment = new Environment()

    const expression = [
      '$select', [':city', ['$count', ':id']],
      ['$having', ['>', ['$count', ':id'], 1],
        ['$group', [':city'],
          ['$where', ['$ilike', ':name', '%oe%'],
            ['$from', ['$as', 'Alpha', '@Alpha']]]]]
    ]
    const result = await evaluator.evaluate(expression, environment)

    expect(result.statement).toEqual(
      'SELECT "city", COUNT("id") ' +
      'FROM "Alpha" AS "Alpha" ' +
      'WHERE "name" ILIKE !#! ' +
      'GROUP BY "city" ' +
      'HAVING COUNT("id") > !#!')
    expect(result.values).toEqual([1, '%oe%'])
  })

  it('processes "join" clauses', async () => {
    const environment = new Environment()

    const expression = [
      '$join', ['$as', 'Beta', '@Beta'],
      ['=', 'Alpha:id', 'Beta:alphaId'],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]
    const result = await evaluator.evaluate(expression, environment)

    expect(result.statement).toEqual(
      'FROM "Alpha" AS "Alpha" ' +
      'JOIN "Beta" AS "Beta" ' +
      'ON "Alpha"."id" = "Beta"."alphaId"')
    expect(result.values).toEqual([])
  })

  it('processes "order" clauses', async () => {
    const environment = new Environment()

    const expression = [
      '$select', [':id', ':name', ':city', ':age'],
      ['$order', [{ ':city': '$desc' }, ':age'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const result = await evaluator.evaluate(expression, environment)

    expect(result.statement).toEqual(
      'SELECT "id", "name", "city", "age" ' +
      'FROM "Alpha" AS "Alpha" ' +
      'ORDER BY "city" DESC, "age"')
    expect(result.values).toEqual([])
  })
})
