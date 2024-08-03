import { describe, expect, it, beforeEach } from '@jest/globals'
import {
  Entity,
  dedent, Connector, Connection, DefaultLocator
} from '../core/index.js'
import { SqlRepository } from './sql.repository.js'
import { SqlLinker } from './sql.linker.js'

class MockConnection extends Connection {
  constructor (result = {}) {
    super()
    this.statements = []
    this.parameters = []
    this.result = result
  }

  async query (statement, parameters) {
    this.statements.push(statement)
    this.parameters.push(parameters)
    return this.result
  }
}

class MockConnector extends Connector {
  constructor (result = { rows: [] }) {
    super()
    this.connections = []
    this.result = result
  }

  async get () {
    const connection = new MockConnection(this.result)
    this.connections.push(connection)
    return connection
  }
}

describe('SqlLinker', () => {
  class Alpha extends Entity {
    constructor (attributes = {}) {
      super(attributes)
      this.name = attributes.name || ''
    }
  }
  class Beta extends Entity {
    constructor (attributes = {}) {
      super(attributes)
      this.name = attributes.name || ''
      this.alphaId = attributes.alphaId || null
    }
  }

  let linker = null

  beforeEach(async () => {
    const locator = new DefaultLocator({
      reference: 'editor', location: 'namespace'
    })
    const connector = new MockConnector()

    const alphaRepository = new SqlRepository({
      model: new Alpha(), locator, connector
    })
    const betaRepository = new SqlRepository({
      model: new Beta(), locator, connector
    })

    linker = new SqlLinker({ locator, connector }).setup([
      alphaRepository, betaRepository])
  })

  it('can be instantiated', () => {
    expect(linker).toBeTruthy()
  })

  it('queries its repositories using symbolic expressions', async () => {
    const expression = [
      '$select', ['Alpha:name', 'Beta:name'],
      ['$join', ['$as', 'Beta', '@Beta'],
        ['=', 'Alpha:id', 'Beta:alphaId'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const result = await linker.query(expression)

    const [connection] = linker.connector.connections
    expect(result).toEqual([])
    expect(linker.connector.connections.length).toEqual(1)
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent(
        'SELECT "Alpha"."name", "Beta"."name" ' +
        'FROM "namespace"."Alpha" AS "Alpha" ' +
        'JOIN "namespace"."Beta" AS "Beta" ' +
        'ON "Alpha"."id" = "Beta"."alphaId"'
      ).trim())
  })

  it('processes non-sql expressions', async () => {
    const expression = ['_map', 'id', { '': [{ id: 1 }, { id: 2 }] }]

    const result = await linker.query(expression)

    expect(result).toEqual([1, 2])
  })

  it('queries its repositories using an optional context', async () => {
    const expression = [
      '$select', ['Alpha:name', 'Beta:name'],
      ['$join', ['$as', 'Beta', '@Beta'],
        ['$and',
          ['=', 'Alpha:id', 'Beta:alphaId'],
          ['=', 'Alpha:id', '#user.id']],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]
    const context = { '#': { user: { id: 'A007' } } }
    const result = await linker.query(expression, context)

    const [connection] = linker.connector.connections
    expect(result).toEqual([])
    expect(linker.connector.connections.length).toEqual(1)
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent(
        'SELECT "Alpha"."name", "Beta"."name" ' +
        'FROM "namespace"."Alpha" AS "Alpha" ' +
        'JOIN "namespace"."Beta" AS "Beta" ' +
        'ON ("Alpha"."id" = "Beta"."alphaId") ' +
        'AND ("Alpha"."id" = $1)'
      ).trim())
    expect(connection.parameters[0]).toEqual(
      { parameters: ['A007'] }
    )
  })
})
