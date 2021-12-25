import { describe, expect, it, beforeEach } from '@jest/globals'
import { Connection } from '../../src/connector'

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
    expect(Array.isArray(result)).toBe(true)
  })
})
