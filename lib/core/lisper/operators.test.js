import { describe, expect, it } from '@jest/globals'
import { standardOperators } from './operators.js'

describe('Operators', () => {
  it('defines a set of standard operators', () => {
    expect(standardOperators).toBeTruthy()
  })
})
