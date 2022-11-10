import { describe, expect, it, beforeEach } from '@jest/globals'
import { Query } from './query.js'

const assert = (type) => {
  return (value) => {
    // eslint-disable-next-line
    if (typeof value !== type) {
      throw new Error('Wrong type.')
    }
    return value
  }
}

const validator = (schema, value) => {
  schema = [schema].flat().pop()
  if (!Array.isArray(value)) {
    return Object.fromEntries(Object.entries(schema).map(
      ([key, method]) => [key, method(value[key])]))
  }
  return value.map(item => validator(schema, item))
}

class SuccessfulQuery extends Query {
  schema = {
    parameters: {
      limit: assert('number'),
      offset: assert('number')
    },
    result: [{
      name: assert('string'),
      age: assert('number')
    }]
  }

  async perform (parameters) {
    const offset = parameters.offset
    const limit = parameters.limit
    const result = [
      { name: 'John', age: 34 },
      { name: 'Tom', age: 25 },
      { name: 'May', age: 54 },
      { name: 'Gwen', age: 18 },
      { name: 'Peter', age: 22 }
    ]
    return result.slice(offset, offset + limit)
  }
}

class FailingQuery extends Query {
  schema = {
    parameters: {
      limit: assert('number'),
      offset: assert('number')
    },
    result: [{
      name: assert('string'),
      age: assert('number')
    }]
  }

  async perform (parameters) {
    const offset = parameters.offset
    const limit = parameters.limit
    const result = [
      { name: 'John', age: 34 },
      { name: 'Tom', age: '25' },
      { name: 'May', age: 54 },
      { name: 'Gwen', age: '18' },
      { name: 'Peter', age: 22 }
    ]
    return result.slice(offset, offset + limit)
  }
}

class UnvalidatedQuery extends Query {
  async perform (parameters) {
    const offset = parameters.offset
    const limit = parameters.limit
    const result = [
      { name: 'John', age: 34 },
      { name: 'Tom', age: '25' },
      { name: 'May', age: 54 },
      { name: 'Gwen', age: '18' },
      { name: 'Peter', age: 22 }
    ]
    return result.slice(offset, offset + limit)
  }
}

describe('Query', () => {
  let query = null
  beforeEach(function () {
    query = new Query()
  })

  it('is defined', () => {
    expect(query).toBeTruthy()
  })

  it('has a "parameters" and "result" schema properties', () => {
    expect(query.parameters).toBeNull()
    expect(query.result).toBeNull()
  })

  it('executes validating its parameters and obtained result', async () => {
    const query = new SuccessfulQuery({ validator })

    let parameters = { limit: 2, offset: 1 }
    let result = await query.execute(parameters)
    expect(result).toEqual([
      { name: 'Tom', age: 25 },
      { name: 'May', age: 54 }
    ])

    parameters = { limit: 3, offset: 2 }
    result = await query.execute(parameters)
    expect(result).toEqual([
      { name: 'May', age: 54 },
      { name: 'Gwen', age: 18 },
      { name: 'Peter', age: 22 }
    ])
  })

  it('executes validating its parameters and obtained result', async () => {
    const query = new SuccessfulQuery({ validator })

    let parameters = { limit: 2, offset: 1 }
    let result = await query.execute(parameters)
    expect(result).toEqual([
      { name: 'Tom', age: 25 },
      { name: 'May', age: 54 }
    ])

    parameters = { limit: 3, offset: 2 }
    result = await query.execute(parameters)
    expect(result).toEqual([
      { name: 'May', age: 54 },
      { name: 'Gwen', age: 18 },
      { name: 'Peter', age: 22 }
    ])
  })

  it('fails at execution if it validator fails as well', async () => {
    const query = new FailingQuery({ validator })

    const parameters = { limit: 2, offset: 1 }

    await expect(query.execute(parameters)).rejects.toThrow('Wrong type.')
  })

  it('does not validate if no validation function is provided', async () => {
    const query = new FailingQuery()

    const parameters = { limit: 2, offset: 1 }

    const result = await query.execute(parameters)
    expect(result).toEqual([
      { name: 'Tom', age: '25' },
      { name: 'May', age: 54 }
    ])
  })

  it('does not validate without parameters and result schemas', async () => {
    const query = new UnvalidatedQuery()

    const parameters = { limit: 2, offset: 1 }

    const result = await query.execute(parameters)
    expect(result).toEqual([
      { name: 'Tom', age: '25' },
      { name: 'May', age: 54 }
    ])
  })
})
