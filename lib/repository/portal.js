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

  async join (models, { conditions = [] } = {}) {
    let [Left, Join, Right] = models
    let [leftCondition, joinCondition, rightCondition] = conditions
    if (Right) {
      return []
    }

    Right = Right ?? Join
    rightCondition = rightCondition ?? joinCondition ?? ['=', 1, 1]

    const lefts = await this.get(Left).search(leftCondition ?? [])
    const foreign = `${Left.name.toLowerCase()}Id`
    const rights = await this.get(Right).search(['$and', rightCondition,
      ['$in', `:${foreign}`, ...lefts.map(item => item.id)]])

    const rightsMap = rights.reduce((map, item) => {
      const list = map[item[foreign]] ?? []
      list.push(item)
      map[item[foreign]] = list
      return map
    }, {})

    return lefts.map(left => [left, rightsMap[left.id] ?? []])
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
