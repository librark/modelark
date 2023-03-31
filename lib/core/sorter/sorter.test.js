import { describe, expect, it, beforeEach } from '@jest/globals'
import { Sorter } from './sorter.js'

describe('Sorter', () => {
  let sorter = null
  beforeEach(() => {
    sorter = new Sorter()
  })

  it('is defined', () => {
    expect(sorter).toBeTruthy()
  })

  it('sorts a dataset by a given field', () => {
    const dataset = [
      { name: 'John Doe', age: 34 },
      { name: 'Richard Roe', age: 30 },
      { name: 'Mark Moe', age: 45 }
    ]

    const sorted = sorter.sort(dataset, 'name')

    expect(sorted).toEqual([
      { name: 'John Doe', age: 34 },
      { name: 'Mark Moe', age: 45 },
      { name: 'Richard Roe', age: 30 }
    ])
  })

  it('sorts a dataset in descending order', async () => {
    const dataset = [
      { name: 'John Doe', age: 34 },
      { name: 'Richard Roe', age: 30 },
      { name: 'Mark Moe', age: 45 }
    ]

    const sorted = sorter.sort(dataset, 'age desc')

    expect(sorted).toEqual([
      { name: 'Mark Moe', age: 45 },
      { name: 'John Doe', age: 34 },
      { name: 'Richard Roe', age: 30 }
    ])
  })

  it('returns the dataset unsorted upon falsy or missing order', () => {
    const dataset = [
      { name: 'John Doe', age: 34 },
      { name: 'Richard Roe', age: 30 },
      { name: 'Mark Moe', age: 45 }
    ]

    const sorted = sorter.sort(dataset)

    expect(sorted).toEqual([
      { name: 'John Doe', age: 34 },
      { name: 'Richard Roe', age: 30 },
      { name: 'Mark Moe', age: 45 }
    ])
  })

  it('sorts non-primitive objects by json stringifying them first', () => {
    const dataset = [
      { name: 'John Doe', birthday: new Date('1989-03-31') },
      { name: 'Richard Roe', birthday: new Date('1993-02-15') },
      { name: 'Mark Moe', birthday: new Date('1978-01-20') }
    ]

    const sorted = sorter.sort(dataset, 'birthday desc')

    expect(sorted).toEqual([
      { name: 'Richard Roe', birthday: new Date('1993-02-15') },
      { name: 'John Doe', birthday: new Date('1989-03-31') },
      { name: 'Mark Moe', birthday: new Date('1978-01-20') }
    ])
  })
})
