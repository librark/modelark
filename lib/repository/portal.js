import { Registry } from '../core/index.js'
import { OrdinaryLinker } from './ordinary.linker.js'

export class Portal extends Registry {
  constructor ({
    repositories = [], check = true, linker = new OrdinaryLinker()
  } = {}) {
    super({ resources: repositories, check })
    this.linker = linker.setup(repositories)
  }

  async query (expression) {
    return this.linker.query(expression)
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
      ['$in', `:id`, ...joins.map(item => item[target])]], rightSegment)
    const rightsMap = reduce(rights)

    const result = []
    for (const left of lefts) {
      const tuples = (joinsMap[left.id] ?? []).map(
        join => [join, rightsMap[join[target]].slice().pop()])
      result.push([left, tuples])
    }

    return result
  }

  _index (resource) {
    return resource.model.name
  }

  _check (resource, name) {
    if (!resource) {
      throw new Error(`A repository for '${name}' has not been provided.`)
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
