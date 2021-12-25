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
})
