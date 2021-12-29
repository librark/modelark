import { describe, expect, it, beforeEach } from '@jest/globals'
// import { Filterer } from '../../../src/common/filterer/fiterer.js'
import { Filterer } from '../../../src/common/filterer'

describe('Fiterer', () => {
  let filterer = null
  beforeEach(() => {
    filterer = new Filterer()
  })

  it('converts a filter tuple into a comparison expression', () => {
    const testTuples = [
      [['field', '=', 99], obj => obj.field === 99, { field: 99 }],
      [['field', '!=', 99], obj => obj.field !== 99, { field: 99 }],
      [['field', '>', 99], obj => obj.field > 99, { field: 99 }],
      [['field', '<', 99], obj => obj.field < 99, { field: 99 }],
      [['field', '>=', 99], obj => obj.field >= 99, { field: 99 }],
      [['field', '<=', 99], obj => obj.field <= 99, { field: 99 }],
      [['field', 'like', 'Abc123'], obj => obj.field.indexOf('Abc123') >= 0,
        { field: 'Abc123' }],
      [['field', 'like', '%Abc123%'], obj => obj.field.indexOf('Abc123') >= 0,
        { field: 'Abc123' }],
      [['field', 'ilike', 'AbC123'],
        obj => obj.field.toLowerCase().indexOf('abc123') >= 0,
        { field: 'ABC123' }],
      [['field', 'ilike', '%AbC123%'],
        obj => obj.field.toLowerCase().indexOf('abc123') >= 0,
        { field: 'ABC123' }],
      [['field', 'in', [1, 2, 3]],
        obj => [1, 2, 3].includes(obj.field), { field: 2 }],
      [['field', 'in', ['1', '2', '3']],
        obj => ['1', '2', '3'].includes(obj.field), { field: '2' }],
      [['field', 'contains', 3],
        obj => obj.field.includes(3), { field: [1, 2, 3] }]
    ]

    for (const testTuple of testTuples) {
      const filterTuple = testTuple[0]
      const expectedFunction = (
        /** @type {(obj: Object) => boolean} */ (testTuple[1]))
      const mockObj = testTuple[2]

      const resultFunction = filterer._parseTuple(filterTuple)
      const result = expectedFunction(mockObj)
      expect(resultFunction(mockObj)).toEqual(result)
    }
  })

  it('joins by default multiple terms with an and', () => {
    const stack = [obj => obj.field2 !== 8, obj => obj.field === 7]

    const expectedFunction = obj => {
      return obj.field === 7 && obj.field2 !== 8
    }

    const resultStack = filterer._defaultJoin(stack)
    const resultFunction = resultStack[0]

    const mockObject = { field: 7, field2: 8 }

    expect(resultFunction(mockObject)).toEqual(
      expectedFunction(mockObject)
    )
  })

  it('parses a full stack of comparison terms with operators', () => {
    const testDomains = [
      [[['field', '=', 7]], obj => obj.field === 7, { field: 7 }],
      [[['field2', '!=', 8]], obj => obj.field2 !== 8, { field2: 8 }],
      [
        [['field', '=', 7], ['field2', '!=', 8]],
        obj => obj.field2 !== 8 && obj.field === 7,
        { field: 7, field2: 8 }
      ],
      [
        [['field', '=', 7], ['field2', '!=', 8], ['field3', '>=', 9]],
        obj => obj.field2 !== 8 && obj.field === 7 && obj.field3 >= 9,
        { field: 7, field2: 8, field3: 9 }
      ],
      [
        ['|', ['field', '=', 7], ['field2', '!=', 8]],
        obj => obj.field2 !== 8 || obj.field === 7,
        { field: 5, field2: 4 }
      ],
      [
        [
          '|',
          ['field', '=', 7],
          '!',
          ['field2', '!=', 8],
          ['field3', '>=', 9]
        ],
        obj =>
          obj.field === 7 || (!(obj.field2 !== 8) && obj.field3 >= 9),
        { field: 7, field2: 8, field3: 9 }
      ],
      [['!', ['field', '=', 7]], obj => !(obj.field === 7), { field: 7 }],
      [
        [['field2', 'in', ['1', '2', '3']]],
        obj => ['1', '2', '3'].includes(obj.field2), { field2: '2' }]
    ]

    for (const testDomain of testDomains) {
      const result = filterer.parse(testDomain[0])
      const expected = /** @type {(obj: Object) => boolean} */ (testDomain[1])
      const obj = testDomain[2]

      expect(result(obj)).toEqual(expected(obj))
    }
  })

  it('Domain is []', () => {
    const domain = []
    const result = filterer.parse(domain)
    expect(result({})).toBe(true)
  })

  it('Domain contains ilike operator', () => {
    const domains = [[[['field', 'ilike', 7]]]]
    for (const domain of domains) {
      const result = filterer.parse(domain[0])
      expect(result).toBeTruthy()
    }
  })
})
