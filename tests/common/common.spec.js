import { describe, expect, it } from '@jest/globals'
import { uuid } from '../../lib/common/common.js'

describe('Common', () => {
  it('offers a "uuid" function', () => {
    const value = uuid()
    expect(value.length).toBe(36)
  })
})
