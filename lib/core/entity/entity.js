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

  static get augmented () {
    return Object.keys(this.fields).some(
      field => !Object.keys(Entity.fields).includes(field))
  }

  constructor (attributes = {}) {
    this.initialize(attributes)

    this.id = attributes.id || uuid()
    this.updatedBy = attributes.updatedBy || this.createdBy
    this.updatedAt = new Date(attributes.updatedAt || this.createdAt)
  }

  initialize (attributes = {}) {
    for (const [field, options] of Object.entries(this.constructor.fields)) {
      const value = attributes[field] || options.default
      this[field] = FIELD_TYPES[options.type](value)
    }
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
