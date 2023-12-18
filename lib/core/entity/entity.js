import { uuid } from '../auxiliary/index.js'

export const FIELD_TYPES = {
  string: (value) => value === null ? value: String(value ?? ''),
  number: (value) => value === null ? value: Number(value ?? 0),
  boolean: (value) => value === null ? value: Boolean(value ?? false),
  integer: (value) => value === null ? value: parseInt(value ?? 0),
  object: (value) => value === null ? value: Object(value ?? {}),
  array: (value) => value === null ? value: Array(...(value ?? [])),
  date: (value) => value === null ? value: new Date(value ?? 0)
}

export class Entity {
  static $id = { type: 'string', default: null }
  static $status = { type: 'string', default: null }
  static $createdAt = { type: 'date', default: null }
  static $updatedAt = { type: 'date', default: null }
  static $createdBy = { type: 'string', default: null }
  static $updatedBy = { type: 'string', default: null }

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

  static _structured = null
  static get structured () {
    if (this._structured === null) {
      this._structured = Object.keys(this.fields).some(
        field => !Object.keys(Entity.fields).includes(field))
    }
    return this._structured
  }

  constructor (attributes = {}) {
    for (const [field, options] of Object.entries(this.constructor.fields)) {
      const value = attributes[field] || this[field] || options.default
      this[field] = FIELD_TYPES[options.type](value)
    }

    /** @type {string} */ this.id = this.id ?? uuid()
    /** @type {string} */ this.status = this.status ?? ''
    /** @type {Date} */ this.createdAt = this.createdAt ?? new Date()
    /** @type {Date} */ this.updatedAt = this.updatedAt ?? this.createdAt
    /** @type {string?} */ this.createdBy = this.createdBy ?? null
    /** @type {string?} */ this.updatedBy = this.updatedBy ?? this.createdBy
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

  toStruct () {
    if (this.constructor.structured) {
      return JSON.parse(JSON.stringify(Object.keys(
        this.constructor.fields).reduce((object, field) => {
        object[field] = this[field]
        return object
      }, {})))
    }
    return JSON.parse(JSON.stringify({ ...this }))
  }
}
