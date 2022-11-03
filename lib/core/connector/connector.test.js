import { describe, expect, it, beforeEach } from '@jest/globals'
import { Connection, Connector } from './connector.js'

describe('Connection', () => {
  let connection = null
  beforeEach(() => {
    connection = new Connection()
  })

  it('is defined', () => {
    expect(connection).toBeTruthy()
  })

  it('defines a query method', async () => {
    const statement = 'SELECT * FROM table WHERE field = {value}'
    const parameters = { value: 77 }
    const result = await connection.query(statement, parameters)
    expect(result?.constructor === Object).toBeTruthy()
  })
})

describe('Connector', () => {
  let connector = null
  beforeEach(() => {
    connector = new Connector()
  })

  it('is defined', () => {
    expect(connector).toBeTruthy()
  })

  it('defines a "get" method', async () => {
    try {
      await connector.get()
    } catch (error) {
      expect(error.message).toBe('Not implemented')
    }
  })

  it('defines a "put" method', async () => {
    try {
      const mockConnection = {}
      await connector.put(mockConnection)
    } catch (error) {
      expect(error.message).toBe('Not implemented')
    }
  })
})
