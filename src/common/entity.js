import { uuid } from './common.js'

export class Entity {
  constructor (attributes = {}) {
    this.id = attributes.id || uuid()
    this.status = attributes.status || ''
    this.createdAt = attributes.createdAt || 0
    this.updatedAt = attributes.updatedAt || this.createdAt
    this.createdBy = attributes.createdBy || ''
    this.updatedBy = attributes.updatedBy || this.createdBy
  }

  transition (state) {
    delete state.id
    Object.assign(this, state)
    return this
  }
}
