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
    expect(entity.createdBy).toBe(null)
    expect(entity.updatedBy).toBe(null)
  })

  it('exposes a transition method for state changes', () => {
    const intake = {
      id: 'NEW_ID',
      updatedAt: 1640302899,
      updatedBy: 'jdoe'
    }
    const result = entity.transition(intake)
    expect(result).toBe(entity)
    expect(entity.id).not.toBe(intake.id)
    expect(entity.updatedAt).toBe(intake.updatedAt)
    expect(entity.updatedBy).toBe(intake.updatedBy)
  })

  it('serializes to JSON', () => {
    const entity = new Entity({
      id: 'E001',
      createdAt: 1640302899,
      createdBy: 'jdoe',
      updatedAt: 1640302899,
      updatedBy: 'jdoe'
    })

    expect(JSON.stringify(entity)).toEqual(JSON.stringify({
      id: 'E001',
      status: '',
      createdAt: '1970-01-19T23:38:22.899Z',
      updatedAt: '1970-01-19T23:38:22.899Z',
      createdBy: 'jdoe',
      updatedBy: 'jdoe'
    }))
  })

  it('serializes its allowed state transitions to JSON', () => {
    class TransitioningEntity extends Entity {
      get transitions () {
        return ['progress', 'done']
      }
    }
    const entity = new TransitioningEntity({
      id: 'E001',
      createdAt: 1640302899,
      createdBy: 'jdoe',
      updatedAt: 1640302899,
      updatedBy: 'jdoe'
    })

    expect(JSON.stringify(entity)).toEqual(JSON.stringify({
      id: 'E001',
      status: '',
      createdAt: '1970-01-19T23:38:22.899Z',
      updatedAt: '1970-01-19T23:38:22.899Z',
      createdBy: 'jdoe',
      updatedBy: 'jdoe',
      transitions: ['progress', 'done']
    }))
  })

  it('serializes to a persistence-ready struct', () => {
    class CustomEntity extends Entity {
      static computed = ['computedField']
      static persisted = ['persistedGetter']

      constructor (attributes) {
        super(attributes)
        this.computedField = 'COMPUTED_DATA'
      }

      get persistedGetter () {
        return 'TO_BE_PERSISTED'
      }
    }
    const entity = new CustomEntity({
      id: 'E001',
      createdAt: 1640302899,
      createdBy: 'jdoe',
      updatedAt: 1640302899,
      updatedBy: 'jdoe',
      computedField: 'ANY_DATA'
    })

    expect(entity.toStruct()).toEqual({
      id: 'E001',
      status: '',
      createdAt: '1970-01-19T23:38:22.899Z',
      updatedAt: '1970-01-19T23:38:22.899Z',
      createdBy: 'jdoe',
      updatedBy: 'jdoe',
      persistedGetter: 'TO_BE_PERSISTED'
    })
  })

  it('displays its state transitions', () => {
    class CustomEntity extends Entity {
      static states = {
        active: { update: 'active', complete: 'done' },
        done: {}
      }

      constructor (attributes) {
        super(attributes)
        this.status = attributes.status || 'active'
      }
    }
    const entity = new CustomEntity({ id: 'E001' })

    expect(entity.transitions).toEqual(
      ['update:active', 'complete:done'])
  })

  it('defines an static build method that returns instances by default', () => {
    const entity = Entity.build()
    expect(entity).toBeInstanceOf(Entity)
  })

  it('defines an static build method that can be subclassed', () => {
    class CustomEntity extends Entity {
      static build (attributes) {
        const color = 'green'
        return new this({ ...attributes, color })
      }

      constructor (attributes) {
        super(attributes)
        this.shape = attributes.shape
        this.color = attributes.color
      }
    }

    const entity = CustomEntity.build({ shape: 'circle' })

    expect(entity).toBeInstanceOf(CustomEntity)
    expect(entity.shape).toBe('circle')
    expect(entity.color).toBe('green')
  })
})
