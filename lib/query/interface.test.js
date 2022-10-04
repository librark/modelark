import { describe, expect, it, beforeEach } from '@jest/globals'
import { QueryInterface } from './interface.js'

describe('QueryInterface', () => {
  let queryInterface = null
  beforeEach(function () {
    queryInterface = new QueryInterface()
  })

  it('is defined', () => {
    expect(queryInterface).toBeTruthy()
  })

  it('defines a "perform" method', async () => {
    const parameters = {}
    await expect(queryInterface.perform(parameters)).rejects.toThrow(
      'Not implemented. Must be described by subclasses.')
  })

  it('defines an "execute" method that calls "perform"', async () => {
    const parameters = {}
    await expect(queryInterface.execute(parameters)).rejects.toThrow(
      'Not implemented. Must be described by subclasses.')
  })
})
