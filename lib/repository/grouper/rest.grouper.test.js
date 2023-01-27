import { describe, expect, it, beforeEach } from '@jest/globals'
import { MemoryRepository } from '../memory.repository.js'
import { RestRepository } from '../rest.repository.js'
import { RestGrouper } from './rest.grouper.js'
import {
  dedent, Connector, Connection, DefaultLocator, Entity
} from '../../core/index.js'

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

class Metric extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.name = attributes.name || ''
    this.category = attributes.category || ''
    this.year = attributes.year || ''
    this.value = attributes.value || 0
  }
}

describe('RestGrouper', () => {
  let grouper = null
  let repository = null
  const mockTimestamp = new Date(1654460843 * 1000)

  beforeEach(() => {
    const model = new Metric()
    const host = 'https://service.knowark.com'
    const locator = new DefaultLocator(
      { reference: 'editor', location: 'namespace' })
    const connector = new MockConnector()
    const clock = () => mockTimestamp
    repository = new RestRepository({
      model, host, locator, connector, clock
    })
    grouper = new RestGrouper()
    grouper.set(repository)
  })

  it('can be instantiated', () => {
    expect(grouper).toBeTruthy()
  })

  it('allows re-setting the rest repositories', () => {
    const restRepository = new RestRepository()
    const memoryRepository = new MemoryRepository()

    const result = grouper.set(restRepository)

    expect(result).toBe(grouper)
    expect(grouper.repository).toBe(restRepository)
    expect(() => grouper.set(memoryRepository)).toThrow()
  })

  it('throws if an instance of RestRepository is not provided', () => {
    expect(() => new RestGrouper()).not.toThrow()
    const grouper = new RestGrouper()
    expect(() => grouper.set(new MemoryRepository())).toThrow()
  })

  it('requests data to the aggregation endpoint', async () => {
    await grouper.group()

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('https://service.knowark.com/aggregation/metric').trim())
    expect(connection.parameters[0]).toEqual({
      options: {
        method: 'GET'
      }
    })
  })

  it('requests data to the aggregation endpoint', async () => {
    await grouper.group()

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('https://service.knowark.com/aggregation/metric').trim())
    expect(connection.parameters[0]).toEqual({
      options: {
        method: 'GET'
      }
    })
  })

  it('can filter the repository records before aggregation', async () => {
    const condition = ['=', ':category', 'special']

    await grouper.group({ condition })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('https://service.knowark.com/aggregation/metric?condition=' +
        '%5B%22%3D%22%2C%22%3Acategory%22%2C%22special%22%5D'
      ).trim())
    expect(connection.parameters[0]).toEqual({
      options: {
        method: 'GET'
      }
    })
  })

  it('groups by multiple fields', async () => {
    const groups = ['category', 'year']

    await grouper.group({ groups })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('https://service.knowark.com/aggregation/metric?groups=' +
        'category%2Cyear'
      ).trim())
    expect(connection.parameters[0]).toEqual({
      options: {
        method: 'GET'
      }
    })
  })

  it('applies multiple aggregations', async () => {
    const groups = ['category', 'year']
    const aggregations = ['sum:value', 'count:id']

    await grouper.group({ groups, aggregations })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('https://service.knowark.com/aggregation/metric?groups=' +
        'category%2Cyear&aggregations=sum%3Avalue%2Ccount%3Aid'
      ).trim())
    expect(connection.parameters[0]).toEqual({
      options: {
        method: 'GET'
      }
    })
  })

  it('applies multiple aggregations with mixed-case parameters', async () => {
    const groups = ['category', 'year']
    const aggregations = [' SUM:value ', 'COUNT:id ']

    await grouper.group({ groups, aggregations })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('https://service.knowark.com/aggregation/metric?groups=' +
        'category%2Cyear&aggregations=sum%3Avalue%2Ccount%3Aid'
      ).trim())
    expect(connection.parameters[0]).toEqual({
      options: {
        method: 'GET'
      }
    })
  })

  it('supports several aggregation methods', async () => {
    const groups = ['category', 'year']
    const aggregations = ['avg:value', 'max:value', 'min:value']

    await grouper.group({ groups, aggregations })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('https://service.knowark.com/aggregation/metric?groups=' +
        'category%2Cyear&aggregations=avg%3Avalue%2Cmax%3Avalue%2Cmin%3Avalue'
      ).trim())
    expect(connection.parameters[0]).toEqual({
      options: {
        method: 'GET'
      }
    })
  })
})
