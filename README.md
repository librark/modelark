<p align="center">
  <a href="https://codecov.io/gh/librark/modelark">
    <img src="https://codecov.io/gh/librark/modelark/graph/badge.svg?token=10xe8G0yN9"/>
  </a>
</p>
<p align="center">
  <a href="https://codecov.io/gh/librark/modelark">
    <img src="https://codecov.io/gh/librark/modelark/graphs/sunburst.svg?token=10xe8G0yN9"/>
  </a>
</p>

# Modelark

Models Definition and Application Data Access Library

See the [executable Portal usage examples](lib/repository/portal.test.js)
for project/task workflows combining `add` and `remove` rejections with memory
and JSON storage, including rejected batches and successful operations.

Declare deletion restrictions with a model's static `rejections`. A rule selects
rows that would violate the restriction; any selected row rejects the operation
with its `message`. `operation: 'remove'` applies the rule to deletions, and
`examine: 'before'` (the default) checks the entire batch before deleting any item.
`#items` contains the records passed to `remove`.

For a restriction similar to `ON DELETE RESTRICT`, declare a query of related
records and mutate through a `Portal`. The portal evaluates the model's rules
against its registered repositories before and after the storage operation:

```js
import { Entity, MemoryRepository, Portal } from '@knowark/modelarkjs'

class Parent extends Entity {
  static rejections = [{
    operation: 'remove',
    message: 'Parents with children cannot be deleted.',
    expression: [
      '$select', [':id'],
      ['$where', ['$in', ':parentId', ['_map', 'id', '#items']],
        ['$from', ['$as', 'Child', '@Child']]]
    ]
  }]
}

class Child extends Entity {
  constructor (attributes = {}) {
    super(attributes)
    this.parentId = attributes.parentId
  }
}

const parents = new MemoryRepository({ model: Parent })
const children = new MemoryRepository({ model: Child })
const portal = new Portal({ repositories: [parents, children] })

const parent = await portal.add(new Parent({ id: 'parent-1' }))
const child = await portal.add(new Child({ parentId: parent.id }))

try {
  await portal.remove(parent)
} catch (error) {
  console.log(error.message) // Parents with children cannot be deleted.
}

await portal.remove(child)
await portal.remove(parent) // Now succeeds.
```

The portal infers the registered repository from each item's constructor.
Batches must contain instances of one model; an empty batch returns `[]` without
running checks or mutations. Rebuild plain records with `new Parent(record)` or
`parents.create(records)` before passing them to the portal.

The same `Parent.rejections` works with `JsonRepository`. Supply your JSON
storage options and register the repositories with a portal:

```js
import { JsonRepository } from '@knowark/modelarkjs'

const children = new JsonRepository({ model: Child, directory, fs, path })
const parents = new JsonRepository({ model: Parent, directory, fs, path })
const portal = new Portal({ repositories: [parents, children] })
```

For SQL, use a portal with `SqlLinker` and the collection names referenced by the
rule. Supply your existing locator and connector:

```js
import { SqlLinker, SqlRepository } from '@knowark/modelarkjs'

const parents = new SqlRepository({
  model: Parent, collection: 'Parent', locator, connector
})
const children = new SqlRepository({
  model: Child, collection: 'Child', locator, connector
})
const portal = new Portal({
  repositories: [parents, children],
  linker: new SqlLinker({ locator, connector })
})
```

Model constructors must retain relation fields such as `Child.parentId` when
rebuilding stored records. Repositories remain independent of the portal and its
linker.

Use `condition` instead of `expression` for restrictions on the model's own
stored rows. For example, this additional rule protects locked parents even if
the caller supplies only their IDs, using `new Parent({ id })` for portal calls:

```js
Parent.rejections.push({
  operation: 'remove',
  message: 'Locked parents cannot be deleted.',
  condition: ['$and',
    ['$in', ':id', ['_map', 'id', '#items']],
    ['=', ':status', 'locked']]
})
```

Repositories and portals use the same declarations. Direct repository
`add`/`remove` calls check rules against the repository's own collection;
`portal.add(items)` and `portal.remove(items)` check them through `Portal.query`
across registered repositories. Use the portal when a rule reads related
collections. A direct repository call whose rule needs an unavailable related
collection fails rather than bypassing the restriction. Give a rule either
`condition` or `expression`; a nonempty `condition` takes precedence.

Portal mutations and compensation invoke the repository's `_add` and `_remove`
storage hooks. Implement storage customizations in these hooks; overrides of the
public repository `add`/`remove` methods are not invoked by the portal.

Portal queries read registered repositories afresh. JSON retrieval treats only
a missing file as an empty collection and propagates invalid JSON and other read
failures. JSON writes propagate storage failures and release the file lock even
when serialization or writing fails. A failed before check prevents the mutation.

Prefer `examine: 'before'` for deletion restrictions. On an after-check rejection
or query failure, `Portal.remove` attempts to restore the records actually
removed, skipping missing IDs. For after-add rules, `Portal.add` snapshots
existing values so it can restore overwritten records and remove newly added
records on rejection. Compensation is best effort and may update metadata.

These application checks do not provide the concurrency guarantees of SQL
foreign keys: use database constraints and appropriate transactions to cover
concurrent or external writes.

Run `npm test -- --runInBand` to execute the tests and collect coverage for every
JavaScript library module. The suite requires 100% statement, branch, function,
and line coverage; only tests and test fixtures are excluded.

With TypeScript installed, check the public declarations and JSDoc-annotated
JavaScript usage fixtures with:

```sh
tsc --noEmit --strict --allowJs --checkJs --target ES2022 --module NodeNext --moduleResolution NodeNext lib/repository/fixtures/*.types.js
```
