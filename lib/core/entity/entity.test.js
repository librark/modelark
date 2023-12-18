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
      id: { type: 'string', default: null },
      status: { type: 'string', default: null },
      createdAt: { type: 'date', default: null },
      updatedAt: { type: 'date', default: null },
      createdBy: { type: 'string', default: null },
      updatedBy: { type: 'string', default: null },

      name: { type: 'string' },
      count: { type: 'integer' },
      width: { type: 'number' }
    })
  })

  it('signals if the class has been structured with additional fields', () => {
    class NonStructured extends Entity {
      constructor (attributes) {
        super(attributes)
        this.name = attributes.name
        this.code = attributes.code
      }
    }

    const nonStructuredInstance = new NonStructured({ name: 'x', code: 120 })

    expect(nonStructuredInstance.name).toEqual('x')
    expect(nonStructuredInstance.code).toEqual(120)
    expect(nonStructuredInstance.constructor.structured).toEqual(false)

    class Structured extends Entity {
      static $name = { type: 'string', default: 'x' }
      /** @type {string} */ name = this.name

      static $code = { type: 'integer', default: 120 }
      /** @type {number} */ code = this.code
    }

    const augmentedInstance = new Structured({ name: 'x', code: 120 })

    expect(augmentedInstance.name).toEqual('x')
    expect(augmentedInstance.code).toEqual(120)
    expect(augmentedInstance.constructor.structured).toEqual(true)
  })

  it('creates an entity from static fields', () => {
    class CustomEntity extends Entity {
      static $name = { type: 'string' }
      /** @type {string} */ name = this.name

      static $height = { type: 'number' }
      /** @type {number} */ height = this.height

      static $count = { type: 'integer' }
      /** @type {number} */ count = this.count

      static $active = { type: 'boolean' }
      /** @type {boolean} */ active = this.active

      static $options = { type: 'object' }
      /** @type {Object} */ options = this.options

      static $items = { type: 'array' }
      /** @type {Array} */ items = this.items

      static $start = { type: 'date' }
      /** @type {Date} */ start = this.start
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
      /** @type {string} */ id = this.id

      static $status = { type: 'string', default: 'active' }
      /** @type {string} */ status = this.status

      static $createdBy = { type: 'string', default: null }
      /** @type {string?} */ createdBy = this.createdBy

      static $updatedBy = { type: 'string', default: null }
      /** @type {string?} */ updatedBy = this.updatedBy

      static $name = { type: 'string', default: 'thing' }
      /** @type {string} */ name = this.name

      static $height = { type: 'number', default: 5.5 }
      /** @type {number} */ height = this.height

      static $active = { type: 'boolean', default: true }
      /** @type {boolean} */ active = this.active

      static $count = { type: 'integer', default: 13 }
      /** @type {number} */ count = this.count

      static $options = { type: 'object', default: { key: 'value' } }
      /** @type {Object} */ options = this.options

      static $items = { type: 'array', default: [1, 'two', null] }
      /** @type {Array} */ items = this.items

      static $start = { type: 'date', default: '2023-11-22' }
      /** @type {Date} */ start = this.start
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

  it('exposes itself as a data transfer object', () => {
    class CustomEntity extends Entity {
      static $createdAt = { type: 'date', default: '2023-11-22' }
      /** @type {Date} */ createdAt = this.createdAt

      static $updatedAt = { type: 'date', default: '2023-11-22' }
      /** @type {Date} */ updatedAt = this.updatedAt

      static $name = { type: 'string', default: 'thing' }
      /** @type {string} */ name = this.name

      static $height = { type: 'number', default: 5.5 }
      /** @type {number} */ height = this.height

      static $active = { type: 'boolean', default: true }
      /** @type {boolean} */ active = this.active

      static $count = { type: 'integer', default: 13 }
      /** @type {number} */ count = this.count
    }

    const instance = new CustomEntity({ id: 'C001' })

    expect(instance.toStruct()).toEqual({
      id: 'C001',
      active: true,
      count: 13,
      createdAt: '2023-11-22T00:00:00.000Z',
      createdBy: null,
      height: 5.5,
      name: 'thing',
      status: '',
      updatedAt: '2023-11-22T00:00:00.000Z',
      updatedBy: null
    })
  })

  it('allows for default null values', () => {
    class NullableEntity extends Entity {
      static $stringField = { type: 'string', default: null }
      static $numberField = { type: 'number', default: null }
      static $booleanField = { type: 'boolean', default: null }
      static $integerField = { type: 'integer', default: null }
      static $objectField = { type: 'object', default: null }
      static $arrayField = { type: 'array', default: null }
      static $dateField = { type: 'date', default: null }
    }

    const instance = new NullableEntity({ id: 'N001' })

    expect(instance.toStruct()).toMatchObject({
      id: 'N001',
      stringField: null,
      numberField: null,
      booleanField: null,
      integerField: null,
      objectField: null,
      arrayField: null,
      dateField: null
    })
  })
})
