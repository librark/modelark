export class Abstract {
  constructor () {
    const prototype = Object.getPrototypeOf(this.constructor)
    const name = this.constructor.name
    if (prototype === Abstract) {
      throw new Error(
        `Abstract class "${name}" should be implemented by concrete classes.`)
    }
    if (this.constructor === Abstract) {
      throw new Error(
        `The "${name}" class should be extended by custom abstract classes.`)
    }
  }

  _abstract (parameters = {}) {
    const method = (new Error()).stack.split(
      '\n')[2].trim().split(' ')[1]
    let { return: returnType, ...parameterTypes } = parameters
    const definition = Object.keys(parameterTypes).join(', ')
    returnType = returnType ? ` : ${returnType}` : ''
    throw new Error(
      `Abstract method "${method}(${definition})${returnType}" ` +
      'has not been implemented.')
  }
}
