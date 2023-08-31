import { uuid } from '../auxiliary/index.js'

export class Entity {
  constructor (attributes = {}) {
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
