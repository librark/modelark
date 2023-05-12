import { describe, expect, it, beforeEach } from '@jest/globals'
import { Linker } from './linker.js'

describe('Linker', () => {
  let linker = null

  beforeEach(() => {
    linker = new Linker()
  })

  it('can be instantiated', () => {
    expect(linker).toBeTruthy()
  })

  it('defines a "setup" method', async () => {
    const repositories = [null]
    expect(() => linker.setup(repositories)).toThrow('Not implemented.')
  })

  it('defines a "query" method', async () => {
    await expect(linker.query([])).rejects.toThrow('Not implemented.')
  })
})
