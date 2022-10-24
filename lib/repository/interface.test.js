import { describe, expect, it, beforeEach } from '@jest/globals'
import { RepositoryInterface } from './interface.js'

describe('RepositoryInterface', () => {
  let repositoryInterface = null
  beforeEach(function () {
    repositoryInterface = new RepositoryInterface()
  })

  it('It is defined', () => {
    expect(repositoryInterface).toBeTruthy()
  })

  it('It defines a "model" property', async () => {
    expect(() => repositoryInterface.model).toThrow('Not implemented.')
  })

  it('It defines a "collection" property', async () => {
    expect(() => repositoryInterface.collection).toThrow('Not implemented.')
  })

  it('It defines an "add" method', async () => {
    const item = { id: '123' }
    await expect(repositoryInterface.add(
      item)).rejects.toThrow('Not implemented.')
  })

  it('It defines a "remove" method', async () => {
    const item = { id: '123' }
    await expect(repositoryInterface.remove(
      item)).rejects.toThrow('Not implemented.')
  })

  it('It defines a "search" method', async () => {
    await expect(
      repositoryInterface.search()).rejects.toThrow('Not implemented.')
  })
})
