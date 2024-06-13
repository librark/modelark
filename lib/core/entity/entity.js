import { uuid } from '../auxiliary/index.js'

export class Entity {
  static computed = []
  static persisted = []
  static build (attributes = {}) {
    return new this(attributes)
  }

  constructor (attributes = {}) {
    this.id = String(attributes.id ?? uuid())
    this.status = String(attributes.status ?? '')
    this.createdAt = new Date(attributes.createdAt ?? new Date())
    this.updatedAt = new Date(attributes.updatedAt ?? this.createdAt)
    this.createdBy = String(attributes.createdBy || '') || null
    this.updatedBy = String(attributes.updatedBy || '') || this.createdBy
  }

  get transitions () {
    const states = this.constructor.states
    if (states) {
      return Object.entries(
        states[this.status]).map(([key, value]) => `${key}:${value}`)
    }
  }

  transition (state) {
    Object.keys(state).filter(
      key => key !== 'id' && key in this).forEach(
      key => { this[key] = state[key] })
    return this
  }

  toJSON () {
    return { ...this, transitions: this.transitions }
  }

  toStruct () {
    const struct = {}
    const properties = [...Object.keys(this), ...this.constructor.persisted]
    for (const property of properties) {
      if (this.constructor.computed.includes(property)) continue
      struct[property] = this[property]
    }
    return JSON.parse(JSON.stringify(struct))
  }
}
