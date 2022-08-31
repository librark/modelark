import { describe, expect, it, beforeEach } from '@jest/globals'
import {
  dedent, DefaultLocator, Entity
} from '../../lib/common/index.js'
import { Connector, Connection } from '../../lib/connector/index.js'
import { SqlsonRepository } from './sqlson.repository.js'

class CustomEntity extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.name = attributes.name || ''
  }
}

class MockConnection extends Connection {
  constructor (result = []) {
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
  constructor (result = []) {
    super()
    this.connections = []
    this.result = []
  }

  async get () {
    const connection = new MockConnection(this.result)
    this.connections.push(connection)
    return connection
  }
}

describe('SqlsonRepository', () => {
  let repository = null
  const mockTimestamp = new Date(1654460843 * 1000)

  beforeEach(function () {
    const model = new CustomEntity()
    const locator = new DefaultLocator(
      { reference: 'editor', location: 'namespace' })
    const connector = new MockConnector()
    const collection = 'elements'
    const clock = () => mockTimestamp

    repository = new SqlsonRepository({
      model, collection, locator, connector, clock
    })
  })

  it('can be instantiated', function () {
    const repository = new SqlsonRepository()
    expect(repository).toBeTruthy()
  })

  it('adds an entity to its data store', async () => {
    const id = 'C001'
    const item = new CustomEntity(
      { id: id, createdAt: mockTimestamp, name: 'John Doe' })

    const records = await repository.add(item)

    const [record] = records
    const [connection] = repository.connector.connections
    expect(Array.isArray(records)).toBe(true)
    expect(records.length).toBe(1)
    expect(record.id).toEqual(id)
    expect(repository.connector.connections.length).toEqual(1)
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('INSERT INTO "namespace"."elements" ("id", "data") ' +
        'VALUES\n($1, $2)\n' +
        'ON CONFLICT (id) DO UPDATE SET\n' +
        '"data"=excluded."data"\n' +
        'RETURNING *;\n'
      ).trim())
    expect(connection.parameters[0]).toEqual([
      'C001', item
    ])
  })

  it('searches all records over a expanded jsonb subquery', async () => {
    await repository.search([], { limit: 2 })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT * FROM (SELECT * FROM ' +
        'jsonb_to_record("namespace"."elements"."data") as\n' +
        'x("id" text, "status" text, "createdAt" text, "updatedAt" text, ' +
        '"createdBy" text, "updatedBy" text, "name" text))\n' +
        'WHERE 1 = 1\n' +
        '\n' +
        'LIMIT 2'
      ).trim())
    expect(connection.parameters[0]).toEqual([])
  })
})
