import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import {
  dedent, Connector, Connection, DefaultLocator, Entity, SqlParser
} from '../../lib/core/index.js'
import { SqlRepository } from './sql.repository.js'
import { Parent, Child, ProtectedEntity } from './fixtures/removal.models.js'
import { Portal } from './portal.js'
import { SqlLinker } from './sql.linker.js'

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
    this.released = []
  }

  async get () {
    const connection = new MockConnection(this.result)
    this.connections.push(connection)
    return connection
  }

  async put (connection) {
    this.released.push(connection)
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

  it('returns the connection to the connector after usage', async () => {
    repository.connector = new MockConnector({
      rows: [{ id: 'C001', createdAt: mockTimestamp, name: 'John Doe' }]
    })
    const item = new CustomEntity(
      { id: 'C001', createdAt: mockTimestamp, name: 'John Doe' })

    await repository.add(item)

    expect(repository.connector.released.length).toEqual(1)
    expect(repository.connector.released[0]).toBe(
      repository.connector.connections[0])
  })

  it('returns the connection even after query failures', async () => {
    class FailingConnector extends MockConnector {
      async get () {
        const connection = await super.get()
        connection.query = async () => {
          throw new Error('boom')
        }
        return connection
      }
    }
    repository.connector = new FailingConnector()
    const item = new CustomEntity(
      { id: 'C001', createdAt: mockTimestamp, name: 'John Doe' })

    await expect(repository.add(item)).rejects.toThrow('boom')

    expect(repository.connector.released.length).toEqual(1)
    expect(repository.connector.released[0]).toBe(
      repository.connector.connections[0])
  })

  it('ignores release attempts without a connection', async () => {
    repository.connector = new MockConnector()

    await repository._release(null)

    expect(repository.connector.released.length).toEqual(0)
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
        'WHERE ("createdAt" > $1) AND ("name" = $2)'
      ).trim())
    expect(connection.parameters[0]).toEqual({
      parameters: [0, 'John']
    })
  })

  it('locks the items fetched through the find method', async () => {
    await repository.find('C001', { lock: true })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT * FROM "namespace"."elements" AS "elements" ' +
        'WHERE "id" = ANY($1) FOR UPDATE'
      ).trim())
    expect(connection.parameters[0]).toEqual({
      parameters: [['C001']]
    })
  })
})

describe('SQL Portal rejections', () => {
  let portal, repository, connection, connector, locator

  beforeEach(() => {
    connection = { query: jest.fn() }
    connector = {
      get: jest.fn(async () => connection),
      put: jest.fn(async () => {})
    }
    locator = new DefaultLocator({ location: 'namespace' })
    repository = new SqlRepository({
      model: Parent, collection: 'Parent', locator, connector
    })
    const children = new SqlRepository({
      model: Child, collection: 'Child', locator, connector
    })
    portal = new Portal({
      repositories: [repository, children],
      linker: new SqlLinker({ locator, connector })
    })
  })

  it.each([
    { id: 'P001' },
    [{ id: 'P002' }, { id: 'P001' }]
  ])('rejects referenced deletion before issuing DELETE: %j', async items => {
    connection.query.mockResolvedValueOnce({ rows: [{ id: 'C001' }] })

    await expect(portal.remove(repository.create(items))).rejects.toThrow(
      'Cannot remove a parent with related children.')

    expect(connection.query.mock.calls).toEqual([[
      'SELECT "id" FROM "namespace"."Child" AS "Child" ' +
      'WHERE "parentId" = ANY($1)',
      { parameters: [[items].flat().map(item => item.id)], mode: undefined }
    ]])
    expect(connector.put).toHaveBeenCalledWith(connection)
  })

  it('checks related and target records once before deleting an unreferenced parent', async () => {
    connection.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'P002', name: 'Unreferenced' }] })

    await expect(portal.remove(new Parent({ id: 'P002' }))).resolves.toMatchObject({
      id: 'P002', name: 'Unreferenced'
    })

    expect(connection.query).toHaveBeenCalledTimes(3)
    expect(connection.query.mock.calls[1]).toEqual([
      'SELECT * FROM "namespace"."Parent" AS "Parent" ' +
      'WHERE ("id" = ANY($1)) AND ("status" = $2)',
      { parameters: [['P002'], 'locked'], mode: undefined }
    ])
    const [statement, options] = connection.query.mock.calls[2]
    expect(statement.replace(/\s+/g, ' ')).toBe(
      'DELETE FROM "namespace"."Parent" WHERE "id" IN ($1) RETURNING *;')
    expect(options).toEqual({ parameters: ['P002'] })
    expect(connector.put).toHaveBeenCalledTimes(3)
  })

  it('preserves local protections when a mixed batch is submitted through Portal', async () => {
    connection.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'P003', status: 'locked' }] })

    await expect(portal.remove(repository.create([
      { id: 'P002' }, { id: 'P003', status: 'open' }
    ]))).rejects.toThrow('Cannot remove a locked parent.')

    expect(connection.query).toHaveBeenCalledTimes(2)
    expect(connection.query.mock.calls[1][1].parameters).toEqual([
      ['P002', 'P003'], 'locked'
    ])
  })

  it('keeps local conditions available to independent repositories', async () => {
    const local = new SqlRepository({
      model: ProtectedEntity, collection: 'ProtectedEntity', locator, connector
    })
    connection.query.mockResolvedValueOnce({ rows: [{ id: 'P001' }] })

    await expect(local.remove({ id: 'P001' })).rejects.toThrow(
      'Cannot remove a locked entity.')

    expect(connection.query).toHaveBeenCalledTimes(1)
    expect(connection.query.mock.calls[0][0]).toContain(
      'FROM "namespace"."ProtectedEntity" AS "ProtectedEntity"')
  })

  it('fails a direct cross-model repository mutation before issuing SQL', async () => {
    await expect(repository.remove({ id: 'P001' })).rejects.toThrow()

    expect(connection.query).not.toHaveBeenCalled()
    expect(connector.put).toHaveBeenCalledTimes(1)
  })

  it('preserves batch ordering and nulls returned by the repository', async () => {
    connection.query.mockResolvedValueOnce({ rows: [{ id: 'C001' }] })

    const result = await portal.remove([
      new Child({ id: 'missing' }), new Child({ id: 'C001' })
    ])

    expect(result[0]).toBeNull()
    expect(result[1]).toBeInstanceOf(Child)
    expect(result[1].id).toBe('C001')
    expect(connection.query).toHaveBeenCalledTimes(1)
  })

  it('preserves null and empty-array removal results', async () => {
    connection.query.mockResolvedValueOnce({ rows: [] })

    await expect(portal.remove(new Child({ id: 'missing' }))).resolves.toBeNull()
    await expect(portal.remove([])).resolves.toEqual([])

    expect(connection.query).toHaveBeenCalledTimes(1)
  })

  it('delegates additions without running remove-only rules or snapshot queries', async () => {
    const item = new Parent({ id: 'P004', name: 'New parent' })
    connection.query.mockResolvedValueOnce({ rows: [item.toStruct()] })

    await expect(portal.add(item)).resolves.toMatchObject({
      id: item.id, name: item.name
    })

    expect(connection.query).toHaveBeenCalledTimes(1)
    expect(connection.query.mock.calls[0][0]).toMatch(/^INSERT INTO/)
  })

  it('does not delete when a Portal check cannot execute', async () => {
    connection.query.mockRejectedValueOnce(new Error('Check unavailable'))

    await expect(portal.remove(new Parent({ id: 'P001' }))).rejects.toThrow(
      'Check unavailable')

    expect(connection.query).toHaveBeenCalledTimes(1)
    expect(connector.put).toHaveBeenCalledTimes(1)
  })

  it('uses the current SQL namespace for model relationships', async () => {
    locator._location = 'another_namespace'
    connection.query.mockResolvedValueOnce({ rows: [{ id: 'C001' }] })

    await expect(portal.remove(new Parent({ id: 'P001' }))).rejects.toThrow(
      'Cannot remove a parent with related children.')

    expect(connection.query.mock.calls[0][0]).toContain(
      'FROM "another_namespace"."Child" AS "Child"')
  })

  it('rejects a missing related repository before issuing SQL', async () => {
    portal = new Portal({
      repositories: [repository],
      linker: new SqlLinker({ locator, connector })
    })

    await expect(portal.remove(new Parent({ id: 'P001' }))).rejects.toThrow()

    expect(connection.query).not.toHaveBeenCalled()
  })

  describe('multiple related model rejections', () => {
    class Project extends Entity {
      static rejections = [{
        operation: 'remove',
        message: 'Cannot remove a project with tasks.',
        expression: [
          '$select', [':id'],
          ['$where', ['$in', ':projectId', ['_map', 'id', '#items']],
            ['$from', ['$as', 'Task', '@Task']]]
        ]
      }, {
        operation: 'remove',
        message: 'Cannot remove a project with milestones.',
        expression: [
          '$select', [':id'],
          ['$where', ['$in', ':projectId', ['_map', 'id', '#items']],
            ['$from', ['$as', 'Milestone', '@Milestone']]]
        ]
      }]
    }

    class Task extends Entity {
      constructor (attributes = {}) {
        super(attributes)
        this.projectId = attributes.projectId || ''
      }
    }

    class Milestone extends Entity {
      constructor (attributes = {}) {
        super(attributes)
        this.projectId = attributes.projectId || ''
      }
    }

    const taskCheck = 'SELECT "id" FROM "namespace"."Task" AS "Task" ' +
      'WHERE "projectId" = ANY($1)'
    const milestoneCheck = 'SELECT "id" FROM "namespace"."Milestone" AS "Milestone" ' +
      'WHERE "projectId" = ANY($1)'

    beforeEach(() => {
      const repositories = [Project, Task, Milestone].map(model => (
        new SqlRepository({ model, collection: model.name, locator, connector })
      ))
      portal = new Portal({
        repositories,
        linker: new SqlLinker({ locator, connector })
      })
    })

    it('rejects a related task before checking milestones or issuing DELETE', async () => {
      connection.query.mockResolvedValueOnce({ rows: [{ id: 'T001' }] })

      await expect(portal.remove(new Project({ id: 'P001' }))).rejects.toThrow(
        'Cannot remove a project with tasks.')

      expect(connection.query.mock.calls).toEqual([[
        taskCheck,
        { parameters: [['P001']], mode: undefined }
      ]])
    })

    it('rejects a batch for related milestones after the task check clears', async () => {
      connection.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'M001' }] })

      await expect(portal.remove([
        new Project({ id: 'P001' }), new Project({ id: 'P002' })
      ])).rejects.toThrow('Cannot remove a project with milestones.')

      expect(connection.query.mock.calls).toEqual([
        [taskCheck, { parameters: [['P001', 'P002']], mode: undefined }],
        [milestoneCheck, { parameters: [['P001', 'P002']], mode: undefined }]
      ])
    })

    it('deletes only after both related-model checks clear in declaration order', async () => {
      connection.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'P001' }, { id: 'P002' }] })

      await expect(portal.remove([
        new Project({ id: 'P001' }), new Project({ id: 'P002' })
      ])).resolves.toMatchObject([{ id: 'P001' }, { id: 'P002' }])

      expect(connection.query.mock.calls.slice(0, 2)).toEqual([
        [taskCheck, { parameters: [['P001', 'P002']], mode: undefined }],
        [milestoneCheck, { parameters: [['P001', 'P002']], mode: undefined }]
      ])
      expect(connection.query).toHaveBeenCalledTimes(3)
      const [statement, options] = connection.query.mock.calls[2]
      expect(statement.replace(/\s+/g, ' ')).toBe(
        'DELETE FROM "namespace"."Project" WHERE "id" IN ($1, $2) RETURNING *;')
      expect(options).toEqual({ parameters: ['P001', 'P002'] })
      expect(connector.put).toHaveBeenCalledTimes(3)
    })
  })

  describe('Portal after checks', () => {
    class Boundary extends Entity {
      constructor (attributes = {}) {
        super(attributes)
        this.name = attributes.name || ''
      }

      static rejections = ['add', 'remove'].map(operation => ({
        operation,
        examine: 'after',
        message: 'Boundary violated.',
        condition: ['=', ':status', 'invalid']
      }))
    }

    beforeEach(() => {
      repository = new SqlRepository({
        model: Boundary, collection: 'Boundary', locator, connector
      })
      portal = new Portal({
        repositories: [repository],
        linker: new SqlLinker({ locator, connector })
      })
    })

    it('restores returned records and omits missing ids after a rejected removal', async () => {
      const stored = new Boundary({ id: 'P001', name: 'Persisted name' })
      connection.query
        .mockResolvedValueOnce({ rows: [stored.toStruct()] })
        .mockResolvedValueOnce({ rows: [{ id: 'P002', status: 'invalid' }] })
        .mockResolvedValueOnce({ rows: [stored.toStruct()] })

      await expect(portal.remove(repository.create([
        { id: 'P001' }, { id: 'missing' }
      ]))).rejects.toThrow('Boundary violated.')

      expect(connection.query.mock.calls.map(
        ([statement]) => statement.split(' ')[0])).toEqual([
        'DELETE', 'SELECT', 'INSERT'
      ])
      const restored = connection.query.mock.calls[2][1].parameters
      expect(restored).toContain('P001')
      expect(restored).toContain('Persisted name')
      expect(restored).not.toContain('missing')
    })

    it('does not create records when a rejected removal deleted nothing', async () => {
      connection.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'P002', status: 'invalid' }] })

      await expect(portal.remove(new Boundary({ id: 'missing' }))).rejects.toThrow(
        'Boundary violated.')

      expect(connection.query).toHaveBeenCalledTimes(2)
    })

    it('propagates a failed deletion without running Portal after checks', async () => {
      connection.query.mockRejectedValueOnce(new Error('Delete failed'))

      await expect(portal.remove(new Boundary({ id: 'P001' }))).rejects.toThrow(
        'Delete failed')

      expect(connection.query).toHaveBeenCalledTimes(1)
      expect(connector.put).toHaveBeenCalledTimes(1)
    })

    it('restores overwritten rows and removes only new rows after a rejected add', async () => {
      const previous = new Boundary({ id: 'P001', name: 'Original' })
      const changed = new Boundary({ id: 'P001', name: 'Changed', status: 'invalid' })
      const added = new Boundary({ id: 'P002', name: 'New' })
      connection.query
        .mockResolvedValueOnce({ rows: [previous.toStruct()] })
        .mockResolvedValueOnce({ rows: [changed.toStruct(), added.toStruct()] })
        .mockResolvedValueOnce({ rows: [changed.toStruct()] })
        .mockResolvedValueOnce({ rows: [added.toStruct()] })
        .mockResolvedValueOnce({ rows: [previous.toStruct()] })

      await expect(portal.add([changed, added])).rejects.toThrow(
        'Boundary violated.')

      expect(connection.query.mock.calls.map(
        ([statement]) => statement.split(' ')[0])).toEqual([
        'SELECT', 'INSERT', 'SELECT', 'DELETE', 'INSERT'
      ])
      expect(connection.query.mock.calls[3][1].parameters).toEqual(['P002'])
      const restored = connection.query.mock.calls[4][1].parameters
      expect(restored).toContain('Original')
      expect(restored).not.toContain('Changed')
      expect(restored).not.toContain('P002')
    })

    it('compensates when an after query fails to execute', async () => {
      const stored = new Boundary({ id: 'P001', name: 'Persisted name' })
      connection.query
        .mockResolvedValueOnce({ rows: [stored.toStruct()] })
        .mockRejectedValueOnce(new Error('After query failed'))
        .mockResolvedValueOnce({ rows: [stored.toStruct()] })

      await expect(portal.remove(new Boundary({ id: stored.id }))).rejects.toThrow(
        'After query failed')

      expect(connection.query.mock.calls.map(
        ([statement]) => statement.split(' ')[0])).toEqual([
        'DELETE', 'SELECT', 'INSERT'
      ])
      expect(connector.put).toHaveBeenCalledTimes(3)
    })
  })
})
