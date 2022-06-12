import { describe, expect, it, beforeEach } from '@jest/globals'
import {
  dedent, DefaultLocator, Entity
} from '../../lib/common/index.js'
import { Connector, Connection } from '../../lib/connector/index.js'
import { SqlRepository } from '../../lib/repository'

class CustomEntity extends Entity {
  constructor (attributes) {
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

describe('SqlRepository', () => {
  let repository = null
  const mockTimestamp = 1654460843

  beforeEach(function () {
    const model = CustomEntity
    const locator = new DefaultLocator(
      { reference: 'editor', location: 'namespace' })
    const connector = new MockConnector()
    const table = 'elements'
    const clock = { now: () => mockTimestamp * 1000 }

    repository = new SqlRepository({
      model, locator, connector, table, clock
    })
  })

  it('can be instantiated', function () {
    const repository = new SqlRepository()
    expect(repository).toBeTruthy()
  })

  it('is defined with custom location and store arguments', function () {
    expect(repository.model).toBe(CustomEntity)
    expect(repository.locator.location()).toBe('namespace')
    expect(repository.locator.reference()).toBe('editor')
  })

  it('adds an entity to its data store', async () => {
    const id = 'C001'
    const item = new CustomEntity({ id: id, name: 'John Doe' })

    const records = await repository.add(item)

    const [record] = records
    const [connection] = repository.connector.connections
    expect(Array.isArray(records)).toBe(true)
    expect(records.length).toBe(1)
    expect(record.id).toEqual(id)
    expect(repository.connector.connections.length).toEqual(1)
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('INSERT INTO namespace.elements (id, status, created_at, ' +
        'updated_at, created_by, updated_by, name) VALUES\n' +
        '($1, $2, $3, $4, $5, $6, $7)\n' +
        'ON CONFLICT (id) DO UPDATE SET\n' +
        'status=excluded.status, created_at=excluded.created_at, ' +
        'updated_at=excluded.updated_at, created_by=excluded.created_by, ' +
        'updated_by=excluded.updated_by, name=excluded.name\n' +
        'RETURNING *;\n'
      ).trim())
    expect(connection.parameters[0]).toEqual([
      'C001', '', 1656116959, 1656116959,
      'editor', 'editor', 'John Doe'
    ])
  })

  it('adds multiple entities to its data store', async () => {
    const records = await repository.add([
      new CustomEntity({ id: 'C001', name: 'John Doe' }),
      new CustomEntity({ id: 'C002', name: 'Jane Tro' }),
      new CustomEntity({ id: 'C003', name: 'Jean Foe' })
    ])

    const [connection] = repository.connector.connections
    expect(Array.isArray(records)).toBe(true)
    expect(records.length).toBe(3)
    expect(repository.connector.connections.length).toEqual(1)
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('INSERT INTO namespace.elements (id, status, created_at, ' +
        'updated_at, created_by, updated_by, name) VALUES\n' +
        '($1, $2, $3, $4, $5, $6, $7),\n' +
        '($8, $9, $10, $11, $12, $13, $14),\n' +
        '($15, $16, $17, $18, $19, $20, $21)\n' +
        'ON CONFLICT (id) DO UPDATE SET\n' +
        'status=excluded.status, created_at=excluded.created_at, ' +
        'updated_at=excluded.updated_at, created_by=excluded.created_by, ' +
        'updated_by=excluded.updated_by, name=excluded.name\n' +
        'RETURNING *;\n'
      ).trim())
    expect(connection.parameters[0]).toEqual([
      'C001', '', 1656116959, 1656116959,
      'editor', 'editor', 'John Doe',
      'C002', '', 1656116959, 1656116959,
      'editor', 'editor', 'Jane Tro',
      'C003', '', 1656116959, 1656116959,
      'editor', 'editor', 'Jean Foe'
    ])
  })

  it('removes an entity from its data store', async () => {
    const item = new CustomEntity({ id: 'C001', name: 'John Doe' })

    const records = await repository.remove(item)

    const [connection] = repository.connector.connections
    expect(records.length).toBe(1)
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('DELETE FROM namespace.elements\n' +
        'WHERE id IN ($1)\n' +
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
      dedent('DELETE FROM namespace.elements\n' +
        'WHERE id IN ($1, $2, $3)\n' +
        'RETURNING *;\n'
      ).trim())
    expect(connection.parameters[0]).toEqual(['C001', 'C002', 'C003'])
  })

  it('searches all records', async () => {
    repository.connection = new MockConnector([
      { id: 'C001', name: 'John Doe' },
      { id: 'C002', name: 'Jane Tro' },
      { id: 'C003', name: 'Jean Foe' }
    ])

    const result = await repository.search([])

    const [connection] = repository.connector.connections
    expect(result.every(
      item => item.constructor.name === 'CustomEntity')).toBeTruthy()
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT * FROM namespace.elements\n' +
        'WHERE 1 = 1'
      ).trim())
    expect(connection.parameters[0]).toEqual([])
  })

  it('searches all records', async () => {
    repository.connection = new MockConnector([
      { id: 'C001', name: 'John Doe' },
      { id: 'C002', name: 'Jane Tro' },
      { id: 'C003', name: 'Jean Foe' }
    ])

    const result = await repository.search([])

    const [connection] = repository.connector.connections
    expect(result.every(
      item => item.constructor.name === 'CustomEntity')).toBeTruthy()
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT * FROM namespace.elements\n' +
        'WHERE 1 = 1'
      ).trim())
    expect(connection.parameters[0]).toEqual([])
  })
})
