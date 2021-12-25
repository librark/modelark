import { describe, expect, it, beforeEach } from '@jest/globals'
import { Connector } from '../../src/connector'

describe('Connector', () => {
  let connector = null
  beforeEach(() => {
    connector = new Connector()
  })

  it('is defined', () => {
    expect(connector).toBeTruthy()
  })
})
