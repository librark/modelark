import { describe, it, expect, beforeEach } from '@jest/globals'
import { Wrapper } from './wrapper.js'

class MockProxy {
  constructor (identifier) {
    this.identifier = identifier
  }

  proxy (method) {
    return async (...args) => {
      const entry = args[0]
      entry.meta.proxies.push(this.identifier)
      return await method(...args)
    }
  }
}

class MockOperator {
  async action (entry) {
    return entry
  }
}

describe('Wrapper', () => {
  let wrapper = null

  beforeEach(() => {
    const proxies = [
      new MockProxy(1),
      new MockProxy(2),
      new MockProxy(3)
    ]
    wrapper = new Wrapper(proxies)
  })

  it('can be instantiated', () => {
    expect(wrapper).toBeTruthy()
  })

  it('wraps the target object and keeps its constructor name', () => {
    const target = new MockOperator()
    const wrappedOperator = wrapper.wrap(target)
    expect(wrappedOperator.constructor.name).toEqual('MockOperator')
  })

  it('wraps the target object methods with the provided proxies', async () => {
    const operator = new MockOperator()
    const wrappedOperator = wrapper.wrap(operator)
    const entry = {
      meta: {
        proxies: []
      },
      data: []
    }

    const response = await wrappedOperator.action(entry)

    expect(response).toEqual({
      meta: {
        proxies: [1, 2, 3]
      },
      data: []
    })
  })

  it('wraps the target object methods with a list of functions', async () => {
    const proxies = [
      (method) => async (...args) => {
        const entry = args[0]
        entry.meta.proxies.push(1)
        return await method(...args)
      },
      (method) => async (...args) => {
        const entry = args[0]
        entry.meta.proxies.push(2)
        return await method(...args)
      },
      (method) => async (...args) => {
        const entry = args[0]
        entry.meta.proxies.push(3)
        return await method(...args)
      }
    ]
    wrapper = new Wrapper(proxies)

    const target = new MockOperator()
    const wrappedOperator = wrapper.wrap(target)
    const entry = {
      meta: {
        proxies: []
      },
      data: []
    }

    const response = await wrappedOperator.action(entry)

    expect(response).toEqual({
      meta: {
        proxies: [1, 2, 3]
      },
      data: []
    })
  })
})
