import { describe, expect, it, beforeEach } from '@jest/globals'
import { Lisper } from './lisper.js'

describe('Lisper', () => {
  let lisper = null
  beforeEach(() => {
    lisper = new Lisper()
  })

  it('can be instantiated', () => {
    expect(lisper).toBeTruthy()
  })

  it('filters by equality expressions', () => {
    const expression = ['=', ':field', 'hello']

    const filter = lisper.parse(expression)

    const object1 = {
      field: 'hello'
    }

    const object2 = {
      field: 'world'
    }

    expect(filter(object1)).toBe(true)
    expect(filter(object2)).toBe(false)
  })

  it('filters by equality expressions multiple fields', () => {
    const expression = ['=', ':field', ':field2', 'hello']

    const filter = lisper.parse(expression)

    const object1 = {
      field: 'hello',
      field2: 'hello'
    }

    const object2 = {
      field: 'world',
      field2: 'hello'
    }

    expect(filter(object1)).toBe(true)
    expect(filter(object2)).toBe(false)
  })

  it('filters by multiple expressions joined by and', () => {
    const expression = ['$and',
      ['=', ':field', 'hello'],
      ['=', ':field2', 'world']
    ]

    const filter = lisper.parse(expression)

    const object1 = {
      field: 'hello',
      field2: 'world'
    }

    const object2 = {
      field: 'world',
      field2: 'hello'
    }

    expect(filter(object1)).toBe(true)
    expect(filter(object2)).toBe(false)
  })

  it('filters by multiple expressions joined by or', () => {
    const expression = ['$or',
      ['=', ':field', 'hello'],
      ['=', ':field2', 'world']
    ]

    const filter = lisper.parse(expression)

    const object1 = {
      field: 'hello',
      field2: 'hello'
    }

    const object2 = {
      field: 'world',
      field2: 'world'
    }

    expect(filter(object1)).toBe(true)
    expect(filter(object2)).toBe(true)
  })

  it('negates expressions', () => {
    const expression = ['$not',
      ['=', ':field', 777]
    ]

    const filter = lisper.parse(expression)

    const object = { field: 888 }

    expect(filter(object)).toBe(true)
  })

  it('filters numerical fields', () => {
    const expression = ['=', ':field', 777]

    const filter = lisper.parse(expression)

    const object = { field: 777 }

    expect(filter(object)).toBe(true)
  })

  it('supports multiple logical operators', () => {
    const scenarios = [
      { expression: ['=', ':field', 5, 5], object: { field: 5 } },
      { expression: ['!=', ':field', 3, 4], object: { field: 5 } },
      { expression: ['>', ':field', 4, 3], object: { field: 5 } },
      { expression: ['<', ':field', 6, 7], object: { field: 5 } },
      { expression: ['>=', ':field', 3, 1], object: { field: 3 } },
      { expression: ['<=', ':field', 3, 6], object: { field: 3 } }
    ]

    for (const scenario of scenarios) {
      const filter = lisper.parse(scenario.expression)
      expect(filter(scenario.object)).toBeTruthy()
    }
  })

  it('filters based on the values in a quoted list', () => {
    const expression = ['$in', ':field', { '': [1, 2, 3] }]

    const filter = lisper.parse(expression)

    const object = { field: 2 }

    expect(filter(object)).toBe(true)
  })

  it('filters based on the values in a sequence of elements', () => {
    const expression = ['$in', ':field', 1, 2, 3]

    const filter = lisper.parse(expression)

    const object = { field: 2 }

    expect(filter(object)).toBe(true)
  })
})
