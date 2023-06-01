import { DataParser } from '../parser/index.js'

export class Filterer {
  constructor () {
    this.parser = new DataParser()
  }

  parse (expression) {
    return async (object) => {
      return this.parser.parse(expression, { ':': objectProxy(object) })
    }
  }
}

const objectProxy = (object) => new Proxy(object, {
  get (target, property) {
    const value = target[property]
    if (value?.constructor === Date) return value.toISOString()
    return value
  }
})
