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

  abstract (parameters = {}, returnType) {
    if (parameters.constructor === Object) {
      parameters = Object.keys(parameters)
    }
    const method = (new Error()).stack.split(
      '\n')[2].trim().split(' ')[1]

    parameters = parameters.map(parameter => [parameter].flat())
    const definition = parameters.map(item => item[0]).join(', ')

    const returns = returnType ? ` : ${returnType.name}` : ''
    throw new Error(
      `Abstract method. "${method}(${definition})${returns}" ` +
      'has not been implemented.')
  }
}
