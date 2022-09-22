import { uuid } from './common.js'

export class Entity {
  constructor (attributes = {}) {
    this.id = attributes.id || uuid()
    this.status = attributes.status || ''
    this.createdAt = attributes.createdAt || new Date()
    this.updatedAt = attributes.updatedAt || this.createdAt
    this.createdBy = attributes.createdBy || ''
    this.updatedBy = attributes.updatedBy || this.createdBy
  }

  transition (state) {
    Object.keys(this).filter(key => key !== 'id').forEach(
      key => { this[key] = state[key] })
    return this
  }
}
