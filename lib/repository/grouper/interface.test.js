import { describe, expect, it, beforeEach } from '@jest/globals'
import { GrouperInterface } from './interface.js'

describe('GrouperInterface', () => {
  let grouper = null

  beforeEach(() => {
    grouper = new GrouperInterface()
  })

  it('can be instantiated', () => {
    const grouper = new GrouperInterface()
    expect(grouper).toBeTruthy()
  })

  it('defines a "group" method', async () => {
    await expect(grouper.group()).rejects.toThrow('Not implemented.')
  })
})
