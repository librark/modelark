import { describe, expect, it, beforeEach } from '@jest/globals'
import { MemoryRepository } from '../memory.repository.js'
import { SqlRepository } from '../sql.repository.js'
import { SqlGrouper } from './sql.grouper.js'
import {
  dedent, Connector, Connection, DefaultLocator, Entity
} from '../../core/index.js'

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

describe('SqlGrouper', () => {
  let grouper = null
  let repository = null

  const mockTimestamp = new Date(1666628425 * 1000)

  beforeEach(async () => {
    const model = new Metric()
    const locator = new DefaultLocator(
      { reference: 'editor', location: 'namespace' })
    const connector = new MockConnector()
    const clock = () => mockTimestamp

    repository = new SqlRepository({ model, locator, connector, clock })

    grouper = new SqlGrouper({ repository })
  })

  it('can be instantiated', () => {
    expect(grouper).toBeTruthy()
  })

  it('allows re-setting the sql repositories', () => {
    const sqlRepository = new SqlRepository()
    const memoryRepository = new MemoryRepository()

    const result = grouper.set(sqlRepository)

    expect(result).toBe(grouper)
    expect(grouper.repository).toBe(sqlRepository)
    expect(() => grouper.set(memoryRepository)).toThrow()
  })

  it('throws if an instance of SqlRepository is not provided', () => {
    expect(() => new SqlGrouper({ repository })).not.toThrow()
    expect(() => new SqlGrouper()).toThrow()
    expect(() => new SqlGrouper({ repository: null })).toThrow()
    expect(() => new SqlGrouper({
      repository: new MemoryRepository()
    })).toThrow()
  })

  it('counts the data stored in the repository by default', async () => {
    await grouper.group()

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT count(*) FROM "namespace"."Metric"\n' +
        'WHERE 1 = 1\n'
      ).trim())
    expect(connection.parameters[0]).toEqual([])
  })

  it('can filter the repository records before aggregation', async () => {
    const domain = [['category', '=', 'special']]

    await grouper.group({ domain })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT count(*) FROM "namespace"."Metric"\n' +
        'WHERE "category" = $1\n'
      ).trim())
    expect(connection.parameters[0]).toEqual(['special'])
  })

  it('groups by multiple fields', async () => {
    const groups = ['category', 'year']

    await grouper.group({ groups })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT count(*) FROM "namespace"."Metric"\n' +
        'WHERE 1 = 1\n' +
        'GROUP BY "category", "year"'
      ).trim())
    expect(connection.parameters[0]).toEqual([])
  })

  it('applies multiple aggregations', async () => {
    const groups = ['category', 'year']
    const aggregations = ['sum:value', 'count:id']

    await grouper.group({ groups, aggregations })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT sum("value"), count("id") FROM "namespace"."Metric"\n' +
        'WHERE 1 = 1\n' +
        'GROUP BY "category", "year"'
      ).trim())
    expect(connection.parameters[0]).toEqual([])
  })

  it('applies multiple aggregations with mixed-case parameters', async () => {
    const groups = ['category', 'year']
    const aggregations = [' SUM:value ', 'COUNT:id ']

    await grouper.group({ groups, aggregations })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT sum("value"), count("id") FROM "namespace"."Metric"\n' +
        'WHERE 1 = 1\n' +
        'GROUP BY "category", "year"'
      ).trim())
    expect(connection.parameters[0]).toEqual([])
  })

  it('supports several aggregation methods', async () => {
    const groups = ['category', 'year']
    const aggregations = ['avg:value', 'max:value', 'min:value']

    await grouper.group({ groups, aggregations })

    const [connection] = repository.connector.connections
    expect(dedent(connection.statements[0]).trim()).toEqual(
      dedent('SELECT avg("value"), max("value"), min("value") ' +
        'FROM "namespace"."Metric"\n' +
        'WHERE 1 = 1\n' +
        'GROUP BY "category", "year"'
      ).trim())
    expect(connection.parameters[0]).toEqual([])
  })
})