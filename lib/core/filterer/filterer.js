import { DataParser } from '../parser/index.js'

export class Filterer {
  constructor () {
    this.parser = new DataParser()
  }

  parse (expression) {
    expression = expression?.length ? expression : true
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
