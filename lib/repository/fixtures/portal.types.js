// @ts-check
// Compile-only declaration checks. Run with an installed TypeScript compiler:
// tsc --noEmit --strict --allowJs --checkJs --target ES2022 --module NodeNext --moduleResolution NodeNext lib/repository/fixtures/*.types.js
import { Entity, MemoryRepository, Portal } from '../../index.js'

class Parent extends Entity {
  name = ''

  static rejections = [{
    operation: 'remove',
    expression: ['$select', [':id'], ['$from', ['$as', 'Child', '@Child']]]
  }]
}

const parent = new Parent({ id: 'P001' })
const portal = new Portal({ repositories: [new MemoryRepository({ model: Parent })] })
/** @type {Promise<Parent>} */
const added = portal.add(parent)
/** @type {Promise<Parent[]>} */
const addedMany = portal.add([parent])
/** @type {Promise<Parent | null>} */
const removed = portal.remove(new Parent({ id: parent.id }))
/** @type {Promise<Array<Parent | null>>} */
const removedMany = portal.remove([parent])
/** @type {Promise<Entity[]>} */
const emptyAdd = portal.add([])
/** @type {Promise<Array<Entity | null>>} */
const emptyRemove = portal.remove([])

// @ts-expect-error Mutations accept only items; their constructors select the model.
portal.add(Parent, parent)
// @ts-expect-error Add requires model instances with the persisted fields.
portal.add({ id: parent.id })
// @ts-expect-error Remove also requires model instances for constructor inference.
portal.remove({ id: parent.id })
/** @type {Promise<Parent>} */
// @ts-expect-error Removed records may be missing.
const missing = portal.remove(new Parent({ id: 'missing' }))

export { added, addedMany, removed, removedMany, emptyAdd, emptyRemove, missing }
