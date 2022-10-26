import { describe, expect, it, beforeEach } from '@jest/globals'
import { Grouper } from './grouper.js'

describe('Grouper', () => {
  let grouper = null

  beforeEach(() => {
    grouper = new Grouper()
  })

  it('can be instantiated', () => {
    const grouper = new Grouper()
    expect(grouper).toBeTruthy()
  })

  it('defines a "set" method', async () => {
    const repository = null
    expect(() => grouper.set(repository)).toThrow('Not implemented.')
  })

  it('defines a "group" method', async () => {
    await expect(grouper.group()).rejects.toThrow('Not implemented.')
  })
})
