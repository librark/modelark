import { QueryInterface } from './interface.js'

export class Query extends QueryInterface {
  constructor ({ validator } = {}) {
    super()
    this.validator = validator || ((_schema, value) => value)
  }

  /** @returns {object|null} */
  get properties () {
    return null
  }

  /** @returns {object|null} */
  get schema () {
    return null
  }

  async validateParameters (value) {
    if (!this.schema?.parameters) return value
    return this.validator(this.schema.parameters, value)
  }

  async validateResult (value) {
    if (!this.schema?.result) return value
    return this.validator(this.schema.result, value)
  }

  /** @param {Object} parameters @return {Object} */
  async execute (parameters) {
    parameters = await this.validateParameters(parameters)
    const result = await super.execute(parameters)
    return await this.validateResult(result)
  }
}
