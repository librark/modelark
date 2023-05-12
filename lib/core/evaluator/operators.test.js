
import { describe, expect, it } from '@jest/globals'
import { baseOperators } from './operators.js'

describe('Operators', () => {
  it('provides default operator implementations', () => {
    expect(baseOperators).toBeTruthy()
  })
})
