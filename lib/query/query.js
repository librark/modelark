import { QueryInterface } from './interface.js'

export class Query extends QueryInterface {
  constructor ({ validator } = {}) {
    super()
    this.validator = validator || ((_schema, value) => value)
  }

  get parameters () {
    return 'PARAMETERS_SCHEMA'
  }

  get result () {
    return 'RESULT_SCHEMA'
  }

  async validateParameters (value) {
    return this.validator(this.parameters, value)
  }

  async validateResult (value) {
    return this.validator(this.result, value)
  }

  async execute (parameters) {
    parameters = await this.validateParameters(parameters)
    const result = await super.execute(parameters)
    return await this.validateResult(result)
  }
}
