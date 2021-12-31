import { describe, expect, it, beforeEach } from '@jest/globals'
import { RepositoryInterface } from '../../lib/repository/interface.js'

describe('RepositoryInterface', () => {
  let repositoryInteface = null
  beforeEach(function () {
    repositoryInteface = new RepositoryInterface()
  })

  it('It is defined', () => {
    expect(repositoryInteface).toBeTruthy()
  })

  it('It defines an "add" method', async () => {
    try {
      const item = { id: '123' }
      await repositoryInteface.add(item)
    } catch (error) {
      expect(error.message).toBe('Not implemented')
    }
  })

  it('It defines a "remove" method', async () => {
    try {
      const item = { id: '123' }
      await repositoryInteface.remove(item)
    } catch (error) {
      expect(error.message).toBe('Not implemented')
    }
  })

  it('It defines a "count" method', async () => {
    try {
      const domain = []
      await repositoryInteface.count(domain)
    } catch (error) {
      expect(error.message).toBe('Not implemented')
    }
  })

  it('It defines a "search" method', async () => {
    try {
      const domain = []
      await repositoryInteface.search(domain)
    } catch (error) {
      expect(error.message).toBe('Not implemented')
    }
  })
})
