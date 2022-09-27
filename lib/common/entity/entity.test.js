import { describe, expect, it, beforeEach } from '@jest/globals'
import { Entity } from './entity.js'

describe('Entity', () => {
  let entity = null
  beforeEach(function () {
    entity = new Entity()
  })

  it('sets a UUID as default id', () => {
    expect(entity.id.length).toEqual(36)
  })

  it('defines an entity common attributes', () => {
    expect(entity.status).toBe('')
    expect(entity.createdAt instanceof Date).toBeTruthy()
    expect(entity.updatedAt instanceof Date).toBeTruthy()
    expect(entity.createdBy).toBe('')
    expect(entity.updatedBy).toBe('')
  })

  it('exposes a transition method for state changes', () => {
    const state = {
      id: 'NEW_ID',
      updatedAt: 1640302899,
      updatedBy: 'jdoe'
    }
    const result = entity.transition(state)
    expect(result).toBe(entity)
    expect(entity.id).not.toBe(state.id)
    expect(entity.updatedAt).toBe(state.updatedAt)
    expect(entity.updatedBy).toBe(state.updatedBy)
  })
})
