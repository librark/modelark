import { describe, expect, it, beforeEach } from '@jest/globals'
import {
  dedent, Connector, Connection, DefaultLocator, Entity
} from '../../lib/core/index.js'
import { RestRepository } from './rest.repository.js'

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

describe('RestRepository', () => {
  let repository = null
  const mockTimestamp = new Date(1654460843 * 1000)

  beforeEach(function () {
    const model = new CustomEntity()
    const host = 'https://service.knowark.com'
    const locator = new DefaultLocator(
      { reference: 'editor', location: 'namespace' })
    const connector = new MockConnector()
    const clock = () => mockTimestamp

    repository = new RestRepository({
      model, host, locator, connector, clock
    })
  })

  it('can be instantiated', function () {
    const repository = new RestRepository()
    expect(repository).toBeTruthy()
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
      dedent('https://service.knowark.com/customentity').trim())
    expect(connection.parameters[0]).toEqual({
      options: {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: [{
            id: 'C001',
            status: '',
            createdAt: '2022-06-05T20:27:23.000Z',
            updatedAt: '2022-06-05T20:27:23.000Z',
            createdBy: 'editor',
            updatedBy: 'editor',
            name: 'John Doe'
          }]
        })
      }
    })
  })

  it('returns an empty array if nothing to add', async () => {
    const records = await repository.add([])
    expect(records).toEqual([])
  })

  it('removes an entity from its remote resource', async () => {
    const createdAt = mockTimestamp
    const createdBy = repository.locator.reference()
    const item = new CustomEntity({
      id: 'C001', name: 'John Doe', createdAt, createdBy
    })

    const record = await repository.remove(item)

    const [connection] = repository.connector.connections
    expect(record.id).toEqual('C001')
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('https://service.knowark.com/customentity/C001').trim())
    expect(connection.parameters[0]).toEqual({
      options: {
        method: 'DELETE'
      }
    })
  })

  it('removes multiple entities from its remote resource', async () => {
    const createdAt = mockTimestamp
    const createdBy = repository.locator.reference()
    const item1 = new CustomEntity({
      id: 'C001', name: 'John Doe', createdAt, createdBy
    })
    const item2 = new CustomEntity({
      id: 'C002', name: 'Rogan Roe', createdAt, createdBy
    })

    const records = await repository.remove([item1, item2])

    const [connection] = repository.connector.connections

    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('https://service.knowark.com/customentity?ids=C001,C002').trim())
    expect(connection.parameters[0]).toEqual({
      options: {
        method: 'DELETE'
      }
    })
  })
})
