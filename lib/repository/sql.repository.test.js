import { describe, expect, it, beforeEach } from '@jest/globals'
import {
  dedent, Connector, Connection, DefaultLocator, Entity
} from '../../lib/core/index.js'
import { SqlRepository } from './sql.repository.js'

class CustomEntity extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.name = attributes.name || ''
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
    this.connections = []
    this.result = result
  }

  async get () {
    const connection = new MockConnection(this.result)
    this.connections.push(connection)
    return connection
  }
}

describe('SqlRepository', () => {
  let repository = null
  const mockTimestamp = new Date(1654460843 * 1000)

  beforeEach(function () {
    const model = new CustomEntity()
    const locator = new DefaultLocator(
      { reference: 'editor', location: 'namespace' })
    const connector = new MockConnector()
    const collection = 'elements'
    const clock = () => mockTimestamp

    repository = new SqlRepository({
      model, collection, locator, connector, clock
    })
  })

  it('can be instantiated', function () {
    const repository = new SqlRepository()
    expect(repository).toBeTruthy()
  })

  it('is defined with custom location and store arguments', function () {
    expect(repository.model.constructor).toBe(CustomEntity)
    expect(repository.locator.location()).toBe('namespace')
    expect(repository.locator.reference()).toBe('editor')
  })

  it('adds an entity to its data store', async () => {
    const id = 'C001'
    const item = new CustomEntity(
      { id, createdAt: mockTimestamp, name: 'John Doe' })

    const record = await repository.add(item)

    const [connection] = repository.connector.connections
    expect(record.id).toEqual(id)
    expect(repository.connector.connections.length).toEqual(1)
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('INSERT INTO "namespace"."elements" ("id", "status", ' +
        '"createdAt", "updatedAt", "createdBy", "updatedBy"' +
        ', "name") VALUES\n($1, $2, $3, $4, $5, $6, $7)\n' +
        'ON CONFLICT (id) DO UPDATE SET\n' +
        '"status"=excluded."status", "createdAt"=excluded."createdAt", ' +
        '"updatedAt"=excluded."updatedAt", ' +
        '"createdBy"=excluded."createdBy", ' +
        '"updatedBy"=excluded."updatedBy", "name"=excluded."name"\n' +
        'RETURNING *;\n'
      ).trim())
    expect(connection.parameters[0]).toEqual([
      'C001', '', mockTimestamp, mockTimestamp,
      'editor', 'editor', 'John Doe'
    ])
  })

  it('returns an empty array if nothing to add', async () => {
    const records = await repository.add([])
    expect(records).toEqual([])
  })

  it('sets the update time as create time if not truthy', async () => {
    const item = new CustomEntity({ name: 'John Doe' })
    item.createdAt = 0

    const record = await repository.add(item)

    expect(record.createdAt).toEqual(record.updatedAt)
  })

  it('adds multiple entities to its data store', async () => {
    const records = await repository.add([
      new CustomEntity(
        { id: 'C001', createdAt: mockTimestamp, name: 'John Doe' }),
      new CustomEntity(
        { id: 'C002', createdAt: mockTimestamp, name: 'Jane Tro' }),
      new CustomEntity(
        { id: 'C003', createdAt: mockTimestamp, name: 'Jean Foe' })
    ])

    const [connection] = repository.connector.connections
    expect(Array.isArray(records)).toBe(true)
    expect(records.length).toBe(3)
    expect(repository.connector.connections.length).toEqual(1)
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('INSERT INTO "namespace"."elements" ("id", "status", ' +
        '"createdAt", "updatedAt", "createdBy", "updatedBy", "name") ' +
        'VALUES\n($1, $2, $3, $4, $5, $6, $7),\n' +
        '($8, $9, $10, $11, $12, $13, $14),\n' +
        '($15, $16, $17, $18, $19, $20, $21)\n' +
        'ON CONFLICT (id) DO UPDATE SET\n' +
        '"status"=excluded."status", "createdAt"=excluded."createdAt", ' +
        '"updatedAt"=excluded."updatedAt", ' +
        '"createdBy"=excluded."createdBy", ' +
        '"updatedBy"=excluded."updatedBy", "name"=excluded."name"\n' +
        'RETURNING *;\n'
      ).trim())
    expect(connection.parameters[0]).toEqual([
      'C001', '', mockTimestamp, mockTimestamp,
      'editor', 'editor', 'John Doe',
      'C002', '', mockTimestamp, mockTimestamp,
      'editor', 'editor', 'Jane Tro',
      'C003', '', mockTimestamp, mockTimestamp,
      'editor', 'editor', 'Jean Foe'
    ])
  })

  it('removes an entity from its data store', async () => {
    const item = new CustomEntity({ id: 'C001', name: 'John Doe' })

    const record = await repository.remove(item)

    const [connection] = repository.connector.connections
    expect(record.id).toEqual('C001')
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('DELETE FROM "namespace"."elements"\n' +
        'WHERE "id" IN ($1)\n' +
        'RETURNING *;\n'
      ).trim())
    expect(connection.parameters[0]).toEqual(['C001'])
  })

  it('removes multiple entities from its data store', async () => {
    const records = await repository.remove([
      new CustomEntity({ id: 'C001', name: 'John Doe' }),
      new CustomEntity({ id: 'C002', name: 'Jane Tro' }),
      new CustomEntity({ id: 'C003', name: 'Jean Foe' })
    ])

    const [connection] = repository.connector.connections
    expect(records.length).toBe(3)
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('DELETE FROM "namespace"."elements"\n' +
        'WHERE "id" IN ($1, $2, $3)\n' +
        'RETURNING *;\n'
      ).trim())
    expect(connection.parameters[0]).toEqual(['C001', 'C002', 'C003'])
  })

  it('returns an empty array if nothing to remove', async () => {
    const records = await repository.remove([])
    expect(records).toEqual([])
  })

  it('searches all records by default', async () => {
    repository.connection = new MockConnector({
      rows: [
        { id: 'C001', name: 'John Doe' },
        { id: 'C002', name: 'Jane Tro' },
        { id: 'C003', name: 'Jean Foe' }
      ]
    })

    const result = await repository.search()

    const [connection] = repository.connector.connections
    expect(result.every(
      item => item.constructor.name === 'CustomEntity')).toBeTruthy()
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT * FROM "namespace"."elements"\n' +
        'WHERE 1 = 1'
      ).trim())
    expect(connection.parameters[0]).toEqual([])
  })

  it('searches all records and limits them', async () => {
    await repository.search([], { limit: 2 })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT * FROM "namespace"."elements"\n' +
        'WHERE 1 = 1\n' +
        '\n' +
        'LIMIT 2'
      ).trim())
    expect(connection.parameters[0]).toEqual([])
  })

  it('searches all records and offsets them', async () => {
    await repository.search([], { offset: 2 })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT * FROM "namespace"."elements"\n' +
        'WHERE 1 = 1\n' +
        '\n' +
        '\n' +
        'OFFSET 2'
      ).trim())
    expect(connection.parameters[0]).toEqual([])
  })

  it('searches all records and orders them', async () => {
    const order = 'createdAt DESC, id ASC'
    await repository.search([], { order })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT * FROM "namespace"."elements"\n' +
        'WHERE 1 = 1\n' +
        'ORDER BY "createdAt" DESC, "id" ASC'
      ).trim())
    expect(connection.parameters[0]).toEqual([])
  })

  it('searches a specific domain', async () => {
    const domain = [['createdAt', '>', 0], ['name', '=', 'John']]
    await repository.search(domain)

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT * FROM "namespace"."elements"\n' +
        'WHERE "createdAt" > $1 AND "name" = $2 \n'
      ).trim())
    expect(connection.parameters[0]).toEqual([0, 'John'])
  })
})
