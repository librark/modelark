import { uuid } from '../auxiliary/index.js'

export const FIELD_TYPES = {
  string: (value) => String(value ?? ''),
  number: (value) => Number(value ?? 0),
  boolean: (value) => Boolean(value ?? false),
  integer: (value) => parseInt(value ?? 0),
  object: (value) => Object(value ?? {}),
  array: (value) => Array(...(value ?? [])),
  date: (value) => new Date(value ?? Date.now()),
  nullable: (value) => value ?? null
}

export class Entity {
  /** @type {string} */ id
  static $id = { type: 'string' }

  /** @type {string} */ status
  static $status = { type: 'string' }

  /** @type {Date} */ createdAt
  static $createdAt = { type: 'date' }

  /** @type {Date} */ updatedAt
  static $updatedAt = { type: 'date' }

  /** @type {string?} */ createdBy
  static $createdBy = { type: 'string' }

  /** @type {string?} */ updatedBy
  static $updatedBy = { type: 'string' }

  static get fields () {
    const entries = []
    for (const property in this) {
      if (!property.startsWith('$')) continue
      entries.push([property.slice(1), this[property]])
    }
    return Object.fromEntries(entries)
  }

  constructor (attributes = {}) {
    for (const [field, options] of Object.entries(this.constructor.fields)) {
      const defaultValue = FIELD_TYPES[options.type](options.default)
      this[field] = attributes[field] || defaultValue
    }

    this.id = attributes.id || this.id || uuid()
    this.status = attributes.status || this.status
    this.createdBy = attributes.createdBy || this.createdBy
    this.updatedBy = attributes.updatedBy || this.updatedBy || this.createdBy

    this.createdAt = new Date(attributes.createdAt || Date.now())
    this.updatedAt = new Date(attributes.updatedAt || this.createdAt)
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
