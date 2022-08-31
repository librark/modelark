import { describe, expect, it, beforeEach } from '@jest/globals'
import { Connector } from './connector.js'

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
