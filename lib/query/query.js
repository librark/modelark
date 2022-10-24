import { QueryInterface } from './interface.js'

export class Query extends QueryInterface {
  constructor ({ validator } = {}) {
    super()
    this.validator = validator || ((_schema, value) => value)
  }

  get parameters () {
    return null
  }

  get result () {
    return null
  }

  async validateParameters (value) {
    if (!this.parameters) return value
    return this.validator(this.parameters, value)
  }

  async validateResult (value) {
    if (!this.result) return value
    return this.validator(this.result, value)
  }

  /** @param {Object} parameters @return {Object} */
  async execute (parameters) {
    parameters = await this.validateParameters(parameters)
    const result = await super.execute(parameters)
    return await this.validateResult(result)
  }
}
