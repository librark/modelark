import { describe, expect, it, beforeEach } from '@jest/globals'
import { SqlParser } from './sql.parser.js'

describe('SqlParser', () => {
  let parser = null

  beforeEach(() => {
    parser = new SqlParser()
  })

  it('can be instantiated', () => {
    expect(parser).toBeTruthy()
  })

  it('parses condition tuples', async () => {
    const tuples = [
      [['=', ':field', 99], ['"field" = $1', [99]]],
      [['$like', ':field', 'world'], ['"field" LIKE $1', ['world']]],
      [['$ilike', ':field', 'world'], ['"field" ILIKE $1', ['world']]]
    ]

    for (const [expression, expected] of tuples) {
      const result = await parser.parse(expression)
      expect(result).toEqual(expected)
    }
  })

  it('parses single terms', async () => {
    const expression = ['=', ':field', 7]
    const expected = ['"field" = $1', [7]]

    const result = await parser.parse(expression)

    expect(result).toEqual(expected)
  })

  it('parses single terms with multiple values', async () => {
    const expression = ['=', ':field', 7, ':column']
    const expected = ['"field" = $1 AND "column" = $2', [7, 7]]

    const result = await parser.parse(expression)

    expect(result).toEqual(expected)
  })

  it('parses "isnull" statements', async () => {
    const expression = ['$isnull', ':field']
    const expected = ['"field" IS NULL', []]

    const result = await parser.parse(expression)

    expect(result).toEqual(expected)
  })

  it('parses "in" statements', async () => {
    const expression = ['$in', ':field', 7, 8, 9]
    const expected = ['"field" = ANY($1)', [[7, 8, 9]]]

    const result = await parser.parse(expression)

    expect(result).toEqual(expected)
  })

  it('parses "in" statements with quoted lists', async () => {
    const expression = ['$in', ':field', { '': [7, 8, 9] }]
    const expected = ['"field" = ANY($1)', [[7, 8, 9]]]

    const result = await parser.parse(expression)

    expect(result).toEqual(expected)
  })

  it('parses "contains" statements', async () => {
    const expression = ['$contains', ':field', 7, 8, 9]
    const expected = ['"field" @> $1', [[7, 8, 9]]]

    const result = await parser.parse(expression)

    expect(result).toEqual(expected)
  })

  it('parses "contains" statements with quoted lists', async () => {
    const expression = ['$contains', ':field', { '': [7, 8, 9] }]
    const expected = ['"field" @> $1', [[7, 8, 9]]]

    const result = await parser.parse(expression)

    expect(result).toEqual(expected)
  })

  it('negates and expression with "not"', async () => {
    const expression = ['$not', ['=', ':field', 7], ['!=', ':field2', 8]]
    const expected = ['NOT (("field" = $1) AND ("field2" != $2))', [7, 8]]

    const result = await parser.parse(expression)

    expect(result).toEqual(expected)
  })

  it('parses multiple terms', async () => {
    const testConditions = [
      [['$and', ['=', ':field', 7], ['!=', ':field2', 8]],
        ['("field" = $1) AND ("field2" != $2)', [7, 8]]],

      [['$and', ['=', ':abc', 7], ['!=', ':lmn', 8], ['>=', ':xyz', 9]],
        ['("abc" = $1) AND ("lmn" != $2) AND ("xyz" >= $3)', [7, 8, 9]]],

      [['$or', ['=', ':abc', 7], ['!=', ':lmn', 8], ['<=', ':xyz', 9]],
        ['("abc" = $1) OR ("lmn" != $2) OR ("xyz" <= $3)', [7, 8, 9]]],

      [['$or', ['<', ':field', 7], [
        '$not', ['!=', ':field2', 8], ['>=', ':field3', 9]]],
      ['("field" < $1) OR (NOT (("field2" != $2) AND ("field3" >= $3)))',
        [7, 8, 9]]],

      [['$not', ['=', ':field', 7]], ['NOT (("field" = $1))', [7]]],

      [['>', ':field', 7], ['"field" > $1', [7]]],

      [['$and', ['>=', ':field', 7], ['<=', ':field2', 8]],
        ['("field" >= $1) AND ("field2" <= $2)', [7, 8]]],

      [['$in', ':field', 1, 2, 3], ['"field" = ANY($1)', [[1, 2, 3]]]]
    ]

    for (const condition of testConditions) {
      const result = await parser.parse(condition[0])
      const expected = condition[1]
      expect(result).toEqual(expected)
    }
  })
})

describe('SqlParser:Query', () => {
  let parser = null
  beforeEach(() => {
    const tables = ['Alpha', 'Beta']
    parser = new SqlParser({ tables })
  })

  it('can be instantiated', () => {
    expect(parser).toBeTruthy()
  })

  it('processes non-SQL expressions', async () => {
    const expression = ['_map', 'id', { '': [{ id: 1 }, { id: 2 }, { id: 3 }] }]
    const result = await parser.parse(expression)
    expect(result).toEqual([null, [1, 2, 3]])
  })

  it('processes mixed non-SQL expressions', async () => {
    const user = {
      id: '90de1911-040d-4811-9c0d-9ee52aca22a9',
      status: 'active',
      createdAt: '2024-02-26T20:10:41.938Z',
      updatedAt: '2024-02-26T20:10:41.939Z',
      createdBy: '00000000-0000-0000-0000-000000000000',
      updatedBy: '00000000-0000-0000-0000-000000000000',
      email: 'jdoe@example.com',
      username: 'jdoe',
      name: 'John Doe',
      picture: '',
      active: true,
      type: 'normal',
      attributes: {}
    }

    const expression = [
      '_list',
      ['_define', { '': '#user' }, user],
      ['_define', { '': '#items' }, { '': null }],
      [
        '$select', [':id'],
        ['$where', ['=', ':userId', '#user.id'],
          ['$from', ['$as', 'Alpha', '@Alpha']]]
      ]
    ]

    const result = await parser.parse(expression)
    expect(result).toEqual(
      ['SELECT "id" FROM "Alpha" AS "Alpha" WHERE "userId" = $1',
        ['90de1911-040d-4811-9c0d-9ee52aca22a9']]
    )
  })

  it('processes "from" clauses', async () => {
    const expression = ['$from', ['$as', 'Beta', '@Beta']]
    const result = await parser.parse(expression)

    expect(result).toEqual(['FROM "Beta" AS "Beta"', []])
  })

  it('processes "where" clauses', async () => {
    const expression = [
      '$where',

      ['$ilike', ':name', '%oe%'],

      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['FROM "Alpha" AS "Alpha" WHERE "name" ILIKE $1', ['%oe%']])
  })

  it('processes "select" clauses', async () => {
    const expression = [
      '$select', [':name', ':age'],

      ['$where', ['$ilike', ':name', '%uc%'],

        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]

    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT "name", "age" FROM "Alpha" AS "Alpha" ' +
      'WHERE "name" ILIKE $1', ['%uc%']])
  })

  it('processes "select" clauses with "for" locking clauses', async () => {
    const expression = [
      '$for', 'update',

      ['$select', [':name', ':age'],

        ['$where', ['$ilike', ':name', '%uc%'],

          ['$from', ['$as', 'Alpha', '@Alpha']]]
      ]

    ]

    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT "name", "age" FROM "Alpha" AS "Alpha" ' +
      'WHERE "name" ILIKE $1 FOR UPDATE', ['%uc%']])
  })

  it('processes "group" clauses', async () => {
    const expression = [
      '$group', [':city'],

      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['FROM "Alpha" AS "Alpha" GROUP BY "city"', []])
  })

  it('processes "having" clauses', async () => {
    const expression = [
      '$having', ['>', ['$count', '*'], 1],
      ['$group', [':city'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['FROM "Alpha" AS "Alpha" ' +
      'GROUP BY "city" ' +
      'HAVING COUNT(*) > $1', [1]])
  })

  it('processes "having" clauses with multiple parameters', async () => {
    const expression = [
      '$select', [':*'],
      ['$having', ['>', ['$count', '*'], 1],
        ['$group', [':city'],
          ['$where', ['$ilike', ':name', '%oe%'],
            ['$from', ['$as', 'Alpha', '@Alpha']]]]]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT * FROM "Alpha" AS "Alpha" ' +
      'WHERE "name" ILIKE $1 ' +
      'GROUP BY "city" ' +
      'HAVING COUNT(*) > $2', ['%oe%', 1]])
  })

  it('processes "having" clauses with complex conditions', async () => {
    const expression = [
      '$select', [':*'],
      ['$having', ['$and',
        ['>', ['$count', '*'], 1], ['<', ['$min', ':age'], 8]],
      ['$group', [':city'],
        ['$where', ['$ilike', ':name', '%oe%'],
          ['$from', ['$as', 'Alpha', '@Alpha']]]]]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT * FROM "Alpha" AS "Alpha" ' +
      'WHERE "name" ILIKE $1 ' +
      'GROUP BY "city" ' +
      'HAVING (COUNT(*) > $2) AND ' +
      '(MIN("age") < $3)', ['%oe%', 1, 8]])
  })

  it('processes "concat" functions', async () => {
    const expression = [
      '$select', [':city', ['$concat', ':name', ',', ':age']],
      ['$where', ['$ilike', ['$concat', ':name', ',', ':age'], '%oe%'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT "city", CONCAT("name", \',\', "age") ' +
        'FROM "Alpha" AS "Alpha" ' +
        'WHERE CONCAT("name", \',\', "age") ILIKE $1',
      ['%oe%']])
  })

  it('processes aggregate functions in "select" clauses', async () => {
    const expression = [
      '$select', [':city', ['$count', ':id']],
      ['$having', ['>', ['$count', ':id'], 1],
        ['$group', [':city'],
          ['$where', ['$ilike', ':name', '%oe%'],
            ['$from', ['$as', 'Alpha', '@Alpha']]]]]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT "city", COUNT("id") ' +
      'FROM "Alpha" AS "Alpha" ' +
      'WHERE "name" ILIKE $1 ' +
      'GROUP BY "city" ' +
      'HAVING COUNT("id") > $2', ['%oe%', 1]])
  })

  it('processes "join" clauses', async () => {
    const expression = [
      '$join', ['$as', 'Beta', '@Beta'],
      ['=', 'Alpha:id', 'Beta:alphaId'],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['FROM "Alpha" AS "Alpha" ' +
      'JOIN "Beta" AS "Beta" ' +
      'ON "Alpha"."id" = "Beta"."alphaId"', []])
  })

  it('processes "leftJoin" clauses', async () => {
    const expression = [
      '$leftJoin', ['$as', 'Beta', '@Beta'],
      ['=', 'Alpha:id', 'Beta:alphaId'],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['FROM "Alpha" AS "Alpha" ' +
      'LEFT JOIN "Beta" AS "Beta" ' +
      'ON "Alpha"."id" = "Beta"."alphaId"', []])
  })

  it('processes "order" clauses', async () => {
    let expression = [
      '$select', [':id', ':name', ':city', ':age'],
      ['$order', [{ ':city': '$desc' }, ':age'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    let result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT "id", "name", "city", "age" ' +
      'FROM "Alpha" AS "Alpha" ' +
      'ORDER BY "city" DESC, "age"', []])

    expression = [
      '$select', [':id', ':name', ':city', ':age'],
      ['$order', [],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    result = await parser.parse(expression)
    expect(result).toEqual(
      ['SELECT "id", "name", "city", "age" ' +
      'FROM "Alpha" AS "Alpha"', []])
  })

  it('processes "limit" clauses', async () => {
    const expression = [
      '$select', [':id', ':name', ':city', ':age'],
      ['$limit', { offset: 1, limit: 2 },
        ['$order', [{ ':city': '$desc' }, ':age'],
          ['$from', ['$as', 'Alpha', '@Alpha']]]]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT "id", "name", "city", "age" ' +
      'FROM "Alpha" AS "Alpha" ' +
      'ORDER BY "city" DESC, "age" ' +
      'LIMIT $1 OFFSET $2', [2, 1]])
  })

  it('implements multiple aggregate functions', async () => {
    const expression = [
      '$select', [':city', ['$count', ':id'],
        ['$sum', ':age'], ['$avg', ':age'],
        ['$min', ':age'], ['$max', ':age']],
      ['$group', [':city'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT "city", COUNT("id"), SUM("age"), ' +
      'AVG("age"), MIN("age"), MAX("age") ' +
      'FROM "Alpha" AS "Alpha" ' +
      'GROUP BY "city"', []])
  })

  it('supports mathematical operators', async () => {
    const expression = [
      '$select', [
        ['$as', 'add', ['+', ['$sum', ':debit'], ['$sum', ':credit']]],
        ['$as', 'multiply', ['*', ['$sum', ':debit'], ['$sum', ':credit']]],
        ['$as', 'divide', ['/', ['$sum', ':debit'], ['$sum', ':credit']]],
        ['$as', 'balance', ['-', ['$sum', ':debit'], ['$sum', ':credit']]]],
      ['$group', [':accountId'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT (SUM("debit") + SUM("credit")) AS "add", ' +
      '(SUM("debit") * SUM("credit")) AS "multiply", ' +
      '(SUM("debit") / SUM("credit")) AS "divide", ' +
      '(SUM("debit") - SUM("credit")) AS "balance" ' +
      'FROM "Alpha" AS "Alpha" ' +
      'GROUP BY "accountId"', []])
  })

  it('supports the "*" identifier inside "select" and "count"', async () => {
    const expression = [
      '$select', [':*', ['$count', ':*']],
      ['$order', [':region', ':city'],
        ['$group', [':region', ':city'],
          ['$from', ['$as', 'Alpha', '@Alpha']]]]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual([
      'SELECT *, COUNT(*) ' +
      'FROM "Alpha" AS "Alpha" ' +
      'GROUP BY "region", "city" ' +
      'ORDER BY "region", "city"', []])
  })

  it('supports "as" clauses inside "select"', async () => {
    const expression = [
      '$select', [
        ['$as', 'alphaCity', ':city'],
        ['$as', 'alphaMaxAge', ['$max', 'Alpha:age']],
        ['$as', 'alphaCount', ['$count', '*']]
      ],
      ['$limit', 5,
        ['$group', [':city'],
          ['$from', ['$as', 'Alpha', '@Alpha']]]]
    ]

    const result = await parser.parse(expression)

    expect(result).toEqual([
      'SELECT "city" AS "alphaCity", ' +
      'MAX("Alpha"."age") AS "alphaMaxAge", ' +
      'COUNT(*) AS "alphaCount" ' +
      'FROM "Alpha" AS "Alpha" ' +
      'GROUP BY "city" ' +
      'LIMIT $1', [5]])
  })

  it('implements multiple aggregate functions without groups', async () => {
    const expression = [
      '$select', [['$count', ':*'],
        ['$sum', ':age'], ['$avg', ':age'],
        ['$min', ':age'], ['$max', ':age']
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT COUNT(*), SUM("age"), ' +
      'AVG("age"), MIN("age"), MAX("age") ' +
      'FROM "Alpha" AS "Alpha"', []])
  })

  it('implements multiple aggregate with truthy conditions', async () => {
    const expression = [
      '$select', [['$count', ':*'],
        ['$sum', ':age'], ['$avg', ':age'],
        ['$min', ':age'], ['$max', ':age']
      ], ['$where', ['=', 1, 1],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]

    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT COUNT(*), SUM("age"), ' +
        'AVG("age"), MIN("age"), MAX("age") ' +
        'FROM "Alpha" AS "Alpha" ' +
        'WHERE 1 = $1', [1]])
  })

  it('processes "union" clauses', async () => {
    const expression = [
      '$union',
      [
        '$select', [':id', ':name', ':city', ':age'],
        ['$limit', { offset: 1, limit: 2 },
          ['$order', [{ ':city': '$desc' }, ':age'],
            ['$from', ['$as', 'Alpha', '@Alpha']]]]
      ],
      [
        '$select', [':id', ':name', ':city', ':age'],
        ['$limit', { offset: 3, limit: 4 },
          ['$order', [{ ':city': '$desc' }, ':age'],
            ['$from', ['$as', 'Alpha', '@Alpha']]]]
      ]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual([
      '(SELECT "id", "name", "city", "age" ' +
      'FROM "Alpha" AS "Alpha" ' +
      'ORDER BY "city" DESC, "age" ' +
      'LIMIT $1 OFFSET $2) ' +
      'UNION ALL ' +
      '(SELECT "id", "name", "city", "age" ' +
      'FROM "Alpha" AS "Alpha" ' +
      'ORDER BY "city" DESC, "age" ' +
      'LIMIT $3 OFFSET $4)',
      [2, 1, 4, 3]
    ])
  })

  it('processes "union" clauses of a single argument', async () => {
    const expression = [
      '$union',
      [
        '$select', [':id', ':name', ':city', ':age'],
        ['$limit', { offset: 3, limit: 4 },
          ['$order', [{ ':city': '$desc' }, ':age'],
            ['$from', ['$as', 'Alpha', '@Alpha']]]]
      ]
    ]
    const result = await parser.parse(expression)

    expect(result).toEqual([
      'SELECT "id", "name", "city", "age" ' +
      'FROM "Alpha" AS "Alpha" ' +
      'ORDER BY "city" DESC, "age" ' +
      'LIMIT $1 OFFSET $2',
      [4, 3]
    ])
  })

  it('processes subqueries within $from clauses', async () => {
    const expression = [
      '$select', [['$sum', ':sum']],
      ['$from', ['$as', 'Subquery',
        ['$select', [':city', ['$count', ':id'], ['$sum', ':age']],
          ['$group', [':city'],
            ['$from', ['$as', 'Alpha', '@Alpha']]]]]]
    ]

    const result = await parser.parse(expression)

    expect(result).toEqual([
      'SELECT SUM("sum") ' +
      'FROM (' +
      'SELECT "city", COUNT("id"), SUM("age") ' +
      'FROM "Alpha" AS "Alpha" ' +
      'GROUP BY "city"' +
      ') AS "Subquery"',
      []
    ])
  })

  it('filters the values used on aggregations', async () => {
    const expression = [
      '$select', [':city',
        ['$count', ':id'],
        ['$avg', ':age'],
        ['$as', 'avgOver30', ['$avg', ['$filter', ':age', ['>', ':age', 30]]]]
      ],
      ['$group', [':city'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]

    const result = await parser.parse(expression)

    expect(result).toEqual([
      'SELECT "city", COUNT("id"), AVG("age"), ' +
      'AVG("age") FILTER(WHERE "age" > 30) AS "avgOver30" ' +
      'FROM "Alpha" AS "Alpha" ' +
      'GROUP BY "city"',
      []
    ])
  })

  it('extracts datetime components from the given date', async () => {
    const expression = [
      '$select', [
        ':name',
        ['$extract', 'day', ['-', ':endDate', ':startDate']]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT "name", EXTRACT(DAY FROM ("endDate" - "startDate")) ' +
        'FROM "Alpha" AS "Alpha"',
      []])
  })

  it('allows using actual date objects in extract functions', async () => {
    const expression = [
      '$select', [
        ':name',
        ['$extract', 'day', ['-', ':endDate', new Date('2025-03-15')]]
      ],
      ['$from', ['$as', 'Alpha', '@Alpha']]
    ]

    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT "name", EXTRACT(DAY FROM ("endDate" - ' +
        '\'2025-03-15T00:00:00.000Z\'::TIMESTAMPTZ)) ' +
        'FROM "Alpha" AS "Alpha"',
      []])
  })

  it('allows using date objects directly in "select" clauses', async () => {
    const expression = [
      '$select', [':id', ':date', ':name', ':age'],

      ['$where', ['>=', ':date', new Date('2025-02-01')],

        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]

    const result = await parser.parse(expression)

    expect(result).toEqual(
      ['SELECT "id", "date", "name", "age" ' +
        'FROM "Alpha" AS "Alpha" WHERE "date" >= $1',
      [new Date('2025-02-01T00:00:00.000Z')]])
  })
})
