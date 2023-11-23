import { describe, expect, it, beforeEach } from '@jest/globals'
import {
  dedent, Connector, Connection, DefaultLocator, Entity, SqlParser
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
  let mockTimestamp = null

  beforeEach(function () {
    mockTimestamp = new Date(1654460843 * 1000)
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

  it('defines default parser and clock', function () {
    const repository = new SqlRepository()
    expect(repository.parser instanceof SqlParser).toBe(true)
    expect(repository.clock()).toBeTruthy()
  })

  it('is defined with custom location and store arguments', function () {
    expect(repository.model).toBe(CustomEntity)
    expect(repository.locator.location()).toBe('namespace')
    expect(repository.locator.reference()).toBe('editor')
  })

  it('adds an entity to its data store', async () => {
    repository.connector = new MockConnector({
      rows: [{ id: 'C001', createdAt: mockTimestamp, name: 'John Doe' }]
    })
    const item = new CustomEntity(
      { id: 'C001', createdAt: mockTimestamp, name: 'John Doe' })

    const record = await repository.add(item)

    const [connection] = repository.connector.connections
    expect(record.id).toEqual('C001')
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
    mockTimestamp = mockTimestamp.toISOString()
    expect(connection.parameters[0]).toEqual({
      parameters: [
        'C001', '', mockTimestamp, mockTimestamp,
        'editor', 'editor', 'John Doe'
      ]
    })
  })

  it('returns an empty array if nothing to add', async () => {
    repository.connector = new MockConnector({
      rows: [{ id: 'C001', createdAt: mockTimestamp, name: 'John Doe' }]
    })
    const records = await repository.add([])
    expect(records).toEqual([])
  })

  it('sets the update time as create time if not truthy', async () => {
    repository.connector = new MockConnector({ rows: [{ name: 'John Doe' }] })
    const item = new CustomEntity({ name: 'John Doe' })
    item.createdAt = 0

    const record = await repository.add(item)

    expect(record.createdAt).toEqual(record.updatedAt)
  })

  it('adds multiple entities to its data store', async () => {
    const entities = [
      new CustomEntity(
        { id: 'C001', createdAt: mockTimestamp, name: 'John Doe' }),
      new CustomEntity(
        { id: 'C002', createdAt: mockTimestamp, name: 'Jane Tro' }),
      new CustomEntity(
        { id: 'C003', createdAt: mockTimestamp, name: 'Jean Foe' })]
    repository.connector = new MockConnector({
      rows: entities.map(item => ({ ...item }))
    })

    const records = await repository.add(entities)

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
    mockTimestamp = mockTimestamp.toISOString()
    expect(connection.parameters[0]).toEqual({
      parameters: [
        'C001', '', mockTimestamp, mockTimestamp,
        'editor', 'editor', 'John Doe',
        'C002', '', mockTimestamp, mockTimestamp,
        'editor', 'editor', 'Jane Tro',
        'C003', '', mockTimestamp, mockTimestamp,
        'editor', 'editor', 'Jean Foe'
      ]
    })
  })

  it('removes an entity from its data store', async () => {
    repository.connector = new MockConnector({
      rows: [{ id: 'C001', name: 'John Doe' }]
    })
    const item = new CustomEntity({ id: 'C001', name: 'John Doe' })

    const record = await repository.remove(item)

    const [connection] = repository.connector.connections
    expect(record.id).toEqual('C001')
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('DELETE FROM "namespace"."elements"\n' +
        'WHERE "id" IN ($1)\n' +
        'RETURNING *;\n'
      ).trim())
    expect(connection.parameters[0]).toEqual({ parameters: ['C001'] })
  })

  it('removes multiple entities from its data store', async () => {
    const entities = [
      new CustomEntity({ id: 'C001', name: 'John Doe' }),
      new CustomEntity({ id: 'C002', name: 'Jane Tro' }),
      new CustomEntity({ id: 'C003', name: 'Jean Foe' })
    ]
    repository.connector = new MockConnector({
      rows: entities.map(item => ({ ...item }))
    })
    const records = await repository.remove(entities)

    const [connection] = repository.connector.connections
    expect(records.length).toBe(3)
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('DELETE FROM "namespace"."elements"\n' +
        'WHERE "id" IN ($1, $2, $3)\n' +
        'RETURNING *;\n'
      ).trim())
    expect(connection.parameters[0]).toEqual({
      parameters: ['C001', 'C002', 'C003']
    })
  })

  it('returns null when deleting unexisiting entities', async () => {
    const record = await repository.remove(new CustomEntity({
      id: 'C009', name: 'Missing'
    }))

    expect(record).toBeNull()
  })

  it('returns null when deleting unexisiting entities', async () => {
    const entity = new CustomEntity({ id: 'C001', name: 'John Doe' })
    repository.connector = new MockConnector({ rows: [entity] })

    const records = await repository.remove([
      entity,
      new CustomEntity({ id: 'C009', name: 'Missing' })
    ])

    expect(records[0].id).toEqual('C001')
    expect(records[1]).toEqual(null)
  })

  it('returns an empty array if nothing to remove', async () => {
    const records = await repository.remove([])
    expect(records).toEqual([])
  })

  it('queries its own records based on a symbolic expression', async () => {
    class Alpha extends Entity {
      constructor (attributes = {}) {
        super(attributes)
        this.name = attributes.name || ''
        this.category = attributes.category || ''
        this.value = attributes.value || 0
      }
    }
    repository._model = new Alpha()
    repository._collection = 'Alpha'
    repository.connector = new MockConnector({
      rows: [
        { category: 'EARTH', sum: 10 },
        { category: 'WATER', sum: 20 },
        { category: 'WIND', sum: 10 },
        { category: 'FIRE', sum: 20 }
      ]
    })
    const expression = [
      '$select', [':category', ['$sum', ':value']],
      ['$group', [':category'],
        ['$from', ['$as', 'Alpha', '@Alpha']]]
    ]

    const result = await repository.query(expression)

    expect(result).toBeTruthy()
    expect(result).toEqual([
      { category: 'EARTH', sum: 10 },
      { category: 'WATER', sum: 20 },
      { category: 'WIND', sum: 10 },
      { category: 'FIRE', sum: 20 }
    ])
    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT "category", SUM("value") FROM ' +
        '"namespace"."Alpha" AS "Alpha" GROUP BY "category"'
      ).trim())
  })

  it('searches all records by default', async () => {
    repository.connector = new MockConnector({
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
      dedent('SELECT * FROM "namespace"."elements" AS "elements" '
      ).trim())
    expect(connection.parameters[0]).toEqual({ parameters: [] })
  })

  it('searches all records and limits them', async () => {
    await repository.search([], { limit: 2 })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT * FROM "namespace"."elements" AS "elements" LIMIT $1'
      ).trim())
    expect(connection.parameters[0]).toEqual({ parameters: [2] })
  })

  it('searches all records and offsets them', async () => {
    await repository.search([], { offset: 3 })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT * FROM "namespace"."elements" AS "elements" OFFSET $1'
      ).trim())
    expect(connection.parameters[0]).toEqual({ parameters: [3] })
  })

  it('searches all records and orders them', async () => {
    const order = 'createdAt DESC, id ASC'

    await repository.search([], { order })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT * FROM "namespace"."elements" AS "elements" ' +
        'ORDER BY "createdAt" DESC, "id" ASC'
      ).trim())
    expect(connection.parameters[0]).toEqual({ parameters: [] })
  })

  it('searches a specific condition', async () => {
    const condition = ['$and', ['>', ':createdAt', 0], ['=', ':name', 'John']]
    await repository.search(condition)

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT * FROM "namespace"."elements" AS "elements" ' +
        'WHERE "createdAt" > $1 AND "name" = $2'
      ).trim())
    expect(connection.parameters[0]).toEqual({
      parameters: [0, 'John']
    })
  })
})
