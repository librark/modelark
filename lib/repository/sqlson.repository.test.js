import { describe, expect, it, beforeEach } from '@jest/globals'
import {
  dedent, DefaultLocator, Entity, Connection, Connector
} from '../../lib/core/index.js'
import { SqlsonRepository } from './sqlson.repository.js'

class CustomEntity extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.name = attributes.name || ''
  }
}

class StructuredEntity extends Entity {
  static computed = ['computedField']
  constructor (attributes = {}) {
    super(attributes)
    this.computedField = `COMPUTED: ${this.name}`
  }
}

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
    this.result = result
    this.connection = new MockConnection(this.result)
  }

  async get () {
    return this.connection
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

  it('creates the repository table if it does not exist', async () => {
    await repository.search([])
    await repository.search([])

    const connection = repository.connector.connection

    expect(connection.statements.length).toEqual(3)

    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('CREATE TABLE IF NOT EXISTS "namespace"."elements" (\n' +
        '"id" UUID PRIMARY KEY,\n' +
        '"data" JSONB);'
      ).trim())
    expect(dedent(connection.statements[1]).trim()).toContain('SELECT')
    expect(dedent(connection.statements[2]).trim()).toContain('SELECT')
  })

  it('adds an entity to its data store', async () => {
    repository.connector = new MockConnector({
      rows: [{
        id: 'C001',
        data: { id: 'C001', createdAt: mockTimestamp, name: 'John Doe' }
      }]
    })
    const item = new CustomEntity(
      { id: 'C001', createdAt: mockTimestamp, name: 'John Doe' })

    const records = await repository.add([item])

    const [record] = records
    const connection = repository.connector.connection
    expect(Array.isArray(records)).toBe(true)
    expect(records.length).toBe(1)
    expect(record.id).toEqual('C001')
    expect(record.name).toEqual('John Doe')
    expect(connection.statements.length).toEqual(2)

    expect(dedent(connection.statements[0]).trim()).toContain('CREATE')
    expect(dedent(connection.statements[1]).trim()).toEqual(
      dedent('INSERT INTO "namespace"."elements" ("id", "data") ' +
        'VALUES\n($1, $2)\n' +
        'ON CONFLICT (id) DO UPDATE SET\n' +
        '"data"=excluded."data"\n' +
        'RETURNING *;\n'
      ).trim())
    expect(connection.parameters[1]).toEqual({
      parameters: [
        'C001', item.toStruct()
      ]
    })
  })

  it('searches all records over a expanded jsonb subquery', async () => {
    repository.connector = new MockConnector({
      rows: [
        { id: 'C001', createdAt: mockTimestamp, name: 'John Doe' }
      ]
    })
    const result = await repository.search([], { limit: 2 })

    const connection = repository.connector.connection

    expect(dedent(connection.statements[0]).trim()).toContain('CREATE')
    expect(dedent(connection.statements[1]).trim()).toEqual(
      dedent('SELECT * FROM (SELECT x.* FROM "namespace"."elements", ' +
        'jsonb_to_record("data") AS ' +
        'x("id" text, "status" text, "createdAt" text, "updatedAt" text, ' +
        '"createdBy" text, "updatedBy" text, "name" text)) AS "elements" ' +
        'LIMIT $1'
      ).trim())
    expect(connection.parameters[1]).toEqual({ parameters: [2] })
    expect(result.length).toEqual(1)
  })

  it('uses structured entities when available', async () => {
    const model = StructuredEntity
    const locator = new DefaultLocator(
      { reference: 'editor', location: 'namespace' })
    const connector = new MockConnector()
    const collection = 'elements'
    const clock = () => mockTimestamp

    const fields = {
      id: { type: 'string' },
      status: { type: 'string' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
      createdBy: { type: 'string' },
      updatedBy: { type: 'string' },
      name: { type: 'string' },
      computedField: { type: 'string' }
    }

    const repository = new SqlsonRepository({
      model, collection, locator, connector, clock, fields
    })

    repository.connector = new MockConnector({
      rows: [
        { id: 'C001', createdAt: mockTimestamp, name: 'John Doe' }
      ]
    })
    const result = await repository.search([], { limit: 2 })

    const connection = repository.connector.connection

    expect(dedent(connection.statements[0]).trim()).toContain('CREATE')
    expect(dedent(connection.statements[1]).trim()).toEqual(
      dedent('SELECT * FROM (SELECT x.* FROM "namespace"."elements", ' +
        'jsonb_to_record("data") AS ' +
        'x("id" text, "status" text, "createdAt" text, "updatedAt" text, ' +
        '"createdBy" text, "updatedBy" text, "name" text)) AS "elements" ' +
        'LIMIT $1'
      ).trim())
    expect(connection.parameters[1]).toEqual({ parameters: [2] })
    expect(result.length).toEqual(1)
  })
})
