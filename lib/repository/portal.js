import { Registry } from '../core/index.js'
import { OrdinaryLinker } from './ordinary.linker.js'

export class Portal extends Registry {
  constructor ({
    repositories = [], check = true, linker = new OrdinaryLinker()
  } = {}) {
    super({ resources: repositories, check })
    this.linker = linker.setup(repositories)
  }

  async query (expression, context = null) {
    const result = await this.linker.query(expression, context)
    return result.rows
  }

  async add (items) {
    if (Array.isArray(items) && !items.length) return []
    const repository = this._repositoryFor(items)
    await this._checkRejections(repository, 'add', 'before', items)
    const hasAfter = repository.rejections.some(rejection => (
      rejection.operation === 'add' &&
      rejection.examine === 'after'))
    const previous = hasAfter ? await repository.find([items].flat()) : []
    const result = await repository._add(items)
    try {
      await this._checkRejections(repository, 'add', 'after', items)
    } catch (error) {
      const existing = new Map(previous.filter(Boolean).map(
        item => [item.id, item]))
      const added = [result].flat().filter(
        item => item && !existing.has(item.id))
      if (added.length) await repository._remove(added)
      if (existing.size) await repository._add([...existing.values()])
      throw error
    }
    return result
  }

  async remove (items) {
    if (Array.isArray(items) && !items.length) return []
    const repository = this._repositoryFor(items)
    await this._checkRejections(repository, 'remove', 'before', items)
    const result = await repository._remove(items)
    try {
      await this._checkRejections(repository, 'remove', 'after', items)
    } catch (error) {
      const removed = [result].flat().filter(Boolean)
      if (removed.length) await repository._add(removed)
      throw error
    }
    return result
  }

  async join (models, { conditions = [], segments = [], key = '' } = {}) {
    let [Left, Join, Right] = models
    let [leftCondition, joinCondition, rightCondition] = conditions
    let [leftSegment, joinSegment, rightSegment] = segments

    const leftRepository = this.get(Left)
    const leftCollection = leftRepository.collection
    const lefts = await leftRepository.search(leftCondition ?? [], leftSegment)
    let [foreign, target] = key.split(',')
    foreign = (foreign || `${leftCollection.toLowerCase()}Id`).trim()

    if (!Right) {
      Right = Join
      rightCondition = joinCondition ?? ['=', 1, 1]
      rightSegment = joinSegment
      const rightRepository = this.get(Right)
      const rights = await rightRepository.search(['$and', rightCondition,
        ['$in', `:${foreign}`, ...lefts.map(item => item.id)]], rightSegment)
      const rightsMap = reduce(rights, foreign)

      return lefts.map(left => [left, rightsMap[left.id] ?? []])
    }

    joinCondition = joinCondition ?? ['=', 1, 1]
    const joinRepository = this.get(Join)
    const joins = await joinRepository.search(['$and', joinCondition,
      ['$in', `:${foreign}`, ...lefts.map(item => item.id)]], joinSegment)
    const joinsMap = reduce(joins, foreign)

    const rightRepository = this.get(Right)
    const rightCollection = rightRepository.collection
    target = (target || `${rightCollection.toLowerCase()}Id`).trim()
    rightCondition = rightCondition ?? ['=', 1, 1]
    const rights = await rightRepository.search(['$and', rightCondition,
      ['$in', ':id', ...joins.map(item => item[target])]], rightSegment)
    const rightsMap = reduce(rights)

    const result = []
    for (const left of lefts) {
      const tuples = (joinsMap[left.id] ?? []).map(
        join => [join, rightsMap[join[target]].slice().pop()])
      result.push([left, tuples])
    }

    return result
  }

  async gather (model, condition, join = []) {
    const Model = model
    let source = ['$from', ['$as', Model.name, `@${Model.name}`]]
    join = join.map(Relation => [Relation].flat())
    for (const [Relation, field] of join.slice().reverse()) {
      const key = field ?? `${Relation.name.toLowerCase()}Id`
      source = ['$leftJoin',
        ['$as', Relation.name, `@${Relation.name}`],
        ['=', `${Relation.name}:id`, `${Model.name}:${key}`], source]
    }
    const separator = '___'
    const fields = [`${Model.name}:*`, ...join.flatMap(([Relation]) => [
      ['$as', `${separator}${Relation.name}`, `'${separator}${Relation.name}'`],
      `${Relation.name}:*`])]

    const isSingle = condition.constructor === String
    if (isSingle) condition = ['=', ':id', condition]
    const dataset = await this.linker.query([
      '$select', fields, ['$where', condition, source]
    ], { mode: 'array' })

    const models = [Model, ...join.map(([Relation]) => Relation)]
    const namespaces = models.map(model => model.name)
    const dictionaries = dataset.rows.map(record => {
      let modelIndex = 0
      return record.reduce((dictionary, value, index) => {
        const namespace = namespaces[modelIndex]
        const key = dataset.fields[index]
        const field = key.name.split(':').pop()
        if (field.startsWith(separator)) {
          modelIndex += 1
          return dictionary
        }
        dictionary[namespace] = dictionary[namespace] ?? {}
        dictionary[namespace][field] = value
        return dictionary
      }, {})
    })
    const results = dictionaries.map(dictionary => {
      return models.map(Model => {
        const attributes = dictionary[Model.name]
        return attributes ? new Model(attributes) : null
      })
    })
    return isSingle ? results.pop() : results
  }

  set (resource, key = null) {
    super.set(resource, key)
    this.linker.setup(this.values())
  }

  _index (resource) {
    return resource.model.name
  }

  _check (resource, name) {
    if (!resource) {
      throw new Error(`A repository for '${name}' has not been provided.`)
    }
  }

  _repositoryFor (items) {
    const records = [items].flat()
    if (records.some(item => (
      !item || typeof item !== 'object' || Array.isArray(item) ||
      typeof item.constructor !== 'function' || item.constructor === Object))) {
      throw new TypeError('Portal mutations require model instances.')
    }
    const model = records[0].constructor
    if (records.some(item => item.constructor !== model)) {
      throw new TypeError('Portal mutation batches must contain a single model.')
    }
    return this.get(model)
  }

  async _checkRejections (repository, operation, examine, items) {
    const rejections = repository.rejections.filter(rejection => (
      rejection.operation === operation &&
      rejection.examine === examine))
    for (const rejection of rejections) {
      let expression = rejection.expression
      if (rejection.condition.length) {
        expression = [
          '$select', [':*'],
          ['$where', rejection.condition,
            ['$from', ['$as', repository.collection, `@${repository.collection}`]]]
        ]
      }
      const selections = await this.query(expression, {
        '#': { items: [items].flat() }
      })
      if (selections.length) {
        const message = typeof rejection.message === 'function'
          ? rejection.message()
          : rejection.message
        throw new Error(message)
      }
    }
  }
}

function reduce (list, key = 'id') {
  return list.reduce((map, item) => {
    const list = map[item[key]] ?? []
    list.push(item)
    map[item[key]] = list
    return map
  }, {})
}
