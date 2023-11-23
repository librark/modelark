import { uuid } from '../auxiliary/index.js'

export const FIELD_TYPES = {
  string: (value) => String(value ?? ''),
  number: (value) => Number(value ?? 0),
  boolean: (value) => Boolean(value ?? false),
  integer: (value) => parseInt(value ?? 0),
  object: (value) => Object(value ?? {}),
  array: (value) => Array(...(value ?? [])),
  date: (value) => new Date(value ?? 0),
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
    const fields = []
    let prototype = this.prototype
    while (prototype !== Object.prototype) {
      fields.push(Object.entries(prototype.constructor).filter(
        ([property]) => property.startsWith('$')).map(
        ([property, value]) => [property.slice(1), value]))
      prototype = Object.getPrototypeOf(prototype)
    }
    return Object.fromEntries(fields.reverse().flat())
  }

  static _augmented = null
  static get augmented () {
    if (this._augmented === null) {
      this._augmented = Object.keys(this.fields).some(
        field => !Object.keys(Entity.fields).includes(field))
    }
    return this._augmented
  }

  constructor (attributes = {}) {
    this.id = attributes.id || uuid()
    this.status = attributes.status || ''
    this.createdAt = new Date(attributes.createdAt || Date.now())
    this.updatedAt = new Date(attributes.updatedAt || this.createdAt)
    this.createdBy = attributes.createdBy || ''
    this.updatedBy = attributes.updatedBy || this.createdBy
  }

  initialize (attributes = {}) {
    for (const [field, options] of Object.entries(this.constructor.fields)) {
      const value = attributes[field] || options.default || this[field]
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

  toDTO () {
    let self = this
    if (this.constructor.augmented) {
      self = Object.keys(this.constructor.fields).reduce((object, field) => {
        object[field] = this[field]
        return object
      }, {})
    }
    return JSON.parse(JSON.stringify(self))
  }
}
