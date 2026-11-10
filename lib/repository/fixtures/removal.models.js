import { Entity } from '../../core/index.js'

const lockedCondition = ['$and',
  ['$in', ':id', ['_map', 'id', '#items']],
  ['=', ':status', 'locked']
]

export class Parent extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.name = attributes.name || ''
  }

  static rejections = [{
    operation: 'remove',
    examine: 'before',
    message: 'Cannot remove a parent with related children.',
    expression: [
      '$select', [':id'],
      ['$where', ['$in', ':parentId', ['_map', 'id', '#items']],
        ['$from', ['$as', 'Child', '@Child']]]
    ]
  }, {
    operation: 'remove',
    examine: 'before',
    message: 'Cannot remove a locked parent.',
    condition: lockedCondition
  }]
}

export class Child extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.parentId = attributes.parentId || ''
    this.name = attributes.name || ''
  }
}

export class ProtectedEntity extends Entity {
  static rejections = [{
    operation: 'remove',
    examine: 'before',
    message: 'Cannot remove a locked entity.',
    condition: lockedCondition
  }]
}
