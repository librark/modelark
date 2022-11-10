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
}
