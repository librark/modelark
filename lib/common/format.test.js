import { describe, expect, it } from '@jest/globals'
import { camelToSnake, snakeToCamel, dedent } from './format.js'

describe('Format', () => {
  it('can convert snake to camel', () => {
    const kebab = 'my_unique_variable'
    const camel = snakeToCamel(kebab)
    expect(camel).toBe('myUniqueVariable')
  })

  it('can convert camel to snake', () => {
    const camel = 'myUniqueVariable'
    const kebab = camelToSnake(camel)
    expect(kebab).toBe('my_unique_variable')
  })

  it('can dedent a certain text', () => {
    const text = `Hi,
    this text has a nice indentation
    because we defined a dedent function.`

    const expected = (
      'Hi,\n' +
      'this text has a nice indentation\n' +
      'because we defined a dedent function.')

    const result = dedent(text)

    expect(result).toBe(expected)
  })
})
