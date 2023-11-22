import { uuid } from '../auxiliary/index.js'

export class Entity {
  static fields = {}

  /** @type {string} */ id
  static { this.fields.id = { type: 'string' } }

  /** @type {string} */ status
  static { this.fields.status = { type: 'string' } }

  /** @type {Date} */ createdAt
  static { this.fields.createdAt = { type: 'date' } }

  /** @type {Date} */ updatedAt
  static { this.fields.createdAt = { type: 'date' } }

  /** @type {?string} */ createdBy
  static { this.fields.createdBy = { type: 'string' } }

  /** @type {?string} */ updatedBy
  static { this.fields.updatedBy = { type: 'string' } }

  constructor (attributes = {}) {
    for (const [field, options] of Object.entries(this.constructor.fields)) {
      const type = options.type.toLowerCase()
      const defaultValue = options.default || FIELD_TYPES[type]
      this[field] = attributes[field] || defaultValue
    }
    this.id = attributes.id || uuid()
    this.status = attributes.status || ''
    this.createdAt = new Date(attributes.createdAt || Date.now())
    this.updatedAt = new Date(attributes.updatedAt || this.createdAt)
    this.createdBy = attributes.createdBy || ''
    this.updatedBy = attributes.updatedBy || this.createdBy
  }

  get transitions () {}

  transition (state) {
    Object.keys(state).filter(
      key => key !== 'id' && key in this).forEach(
      key => { this[key] = state[key] })
    return this
  }

  toJSON () {
    return { ...this, transitions: this.transitions }
  }
}

export const FIELD_TYPES = {
  string: '',
  number: 0,
  integer: 0,
  boolean: false,
  object: {},
  array: [],
  date: 0
}
