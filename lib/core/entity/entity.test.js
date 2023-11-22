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

  it('allows the definition of fields statically', () => {
    class CustomEntity extends Entity {
      static $name = { type: 'string' }
      static $count = { type: 'integer' }
      static $width = { type: 'number' }
    }

    expect(CustomEntity.fields).toEqual({
      id: { type: 'string' },
      status: { type: 'string' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
      createdBy: { type: 'string' },
      updatedBy: { type: 'string' },

      name: { type: 'string' },
      count: { type: 'integer' },
      width: { type: 'number' }
    })
  })

  it('creates an entity from static fields', () => {
    class CustomEntity extends Entity {
      static $name = { type: 'string' }
      static $height = { type: 'number' }
      static $count = { type: 'integer' }
      static $active = { type: 'boolean' }
      static $options = { type: 'object' }
      static $items = { type: 'array' }
      static $start = { type: 'date' }
    }

    const instance = new CustomEntity()

    expect(instance.name).toEqual('')
    expect(instance.height).toEqual(0)
    expect(instance.active).toEqual(false)
    expect(instance.count).toEqual(0)
    expect(instance.options).toMatchObject({})
    expect(instance.items).toMatchObject([])
    expect(instance.start).toBeInstanceOf(Date)
  })

  it('creates an entity from static fields with custom default values', () => {
    class CustomEntity extends Entity {
      static $id = { type: 'string', default: 'SingletonXYZ' }
      static $status = { type: 'string', default: 'active' }
      static $createdBy = { type: 'nullable' }
      static $name = { type: 'string', default: 'thing' }
      static $height = { type: 'number', default: 5.5 }
      static $active = { type: 'boolean', default: true }
      static $count = { type: 'integer', default: 13 }
      static $options = { type: 'object', default: { key: 'value' } }
      static $items = { type: 'array', default: [1, 'two', null] }
      static $start = { type: 'date', default: '2023-11-22' }
    }

    const instance = new CustomEntity()

    expect(instance.id).toEqual('SingletonXYZ')
    expect(instance.status).toEqual('active')
    expect(instance.createdBy).toEqual(null)
    expect(instance.updatedBy).toEqual(null)
    expect(instance.name).toEqual('thing')
    expect(instance.height).toEqual(5.5)
    expect(instance.active).toEqual(true)
    expect(instance.count).toEqual(13)
    expect(instance.options).toMatchObject({ key: 'value' })
    expect(instance.items).toMatchObject([1, 'two', null])
    expect(instance.start).toMatchObject(new Date('2023-11-22'))
  })
})
