import { describe, expect, it, beforeEach } from '@jest/globals'
import { RepositoryInterface } from '../../src/repository/interface.js'

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
      await repositoryInteface.add()
    } catch (error) {
      expect(error.message).toBe('Not implemented')
    }
  })

  it('It defines a "remove" method', async () => {
    try {
      await repositoryInteface.remove()
    } catch (error) {
      expect(error.message).toBe('Not implemented')
    }
  })

  it('It defines a "count" method', async () => {
    try {
      await repositoryInteface.count()
    } catch (error) {
      expect(error.message).toBe('Not implemented')
    }
  })

  it('It defines a "search" method', async () => {
    try {
      await repositoryInteface.search()
    } catch (error) {
      expect(error.message).toBe('Not implemented')
    }
  })
})
