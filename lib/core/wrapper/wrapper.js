export class Wrapper {
  constructor (proxies, decorator = 'proxy') {
    this.proxies = proxies
    this.decorator = decorator
  }

  wrap (operator) {
    const stack = this.proxies.map(item => {
      if (item instanceof Function) return item
      return item[this.decorator].bind(item)
    }).reverse()

    return new Proxy(operator, {
      get (target, property) {
        const method = target[property]
        if (typeof method !== 'function' ||
          property === 'constructor' ||
          property.startsWith('_')) {
          return method
        }

        return stack.reduce((previous, current) => {
          return current(previous)
        }, method.bind(target))
      }
    })
  }
}
