import { Connector } from '../core/connector/index.js'
import { DataParser } from '../core/parser/index.js'
import { Entity } from '../core/entity/index.js'
import { Locator } from '../core/locator/index.js'
import { Sorter } from '../core/sorter/index.js'
import { Storer } from '../core/storer/index.js'
import { SqlParser } from '../core/parser/index.js'

export declare abstract class RepositoryInterface {
  abstract add (items: Entity): Promise<Entity>
  abstract add (items: Array<Entity>): Promise<Array<Entity>>

  abstract remove (items: Entity): Promise<Entity>
  abstract remove (items: Array<Entity>): Promise<Array<Entity>>

  abstract query (expression: Array<any>, context?: object): Promise<any>
}

export declare abstract class Repository extends RepositoryInterface {
  get model (): Entity

  get collection (): string

  add (items: Entity): Promise<Entity>
  add (items: Array<Entity>): Promise<Array<Entity>>

  remove (items: Entity): Promise<Entity>
  remove (items: Array<Entity>): Promise<Array<Entity>>

  query (expression: Array<any>, context?: object): Promise<any>

  search (
    condition: Array<any>,
    segment?: { limit?: number, offset?: number, order?: string }
  ): Promise<Array<Entity>>

  find (
    values: object,
    options?: { field?: string, init?: boolean }
  ): Promise<Entity>
  find (
    values: Array<object>,
    options?: { field?: string, init?: boolean }
  ): Promise<Array<Entity>>
  find (
    values: object | Array<object>,
    options?: {
      field?: string, init?: boolean, many?: boolean
    } & { many: true }
  ): Promise<Array<Array<Entity>>>

  ensure (
    values: object,
    options: { field: string }
  ): Promise<Entity>
  ensure (
    values: Array<object>,
    options: { field: string }
  ): Promise<Array<Entity>>

}

export declare class MemoryRepository extends Repository {
  constructor(dependencies?: {
    model?: Entity,
    locator?: Locator,
    parser?: DataParser,
    storer?: Storer,
    sorter?: Sorter,
    clock?: () => Date,
    constrains?: object
  })
}

export declare class JsonRepository extends MemoryRepository {
  constructor(dependencies?: {
    model?: Entity,
    locator?: Locator,
    parser?: DataParser,
    sorter?: Sorter,
    clock?: () => Date,
    constrains?: object
    directory?: string,
    collection?: string,
    fs?: object,
    path?: object
  })
}

export declare class SqlRepository extends Repository {
  constructor(dependencies?: {
    model?: Entity,
    collection?: string,
    locator?: Locator,
    connector?: Connector,
    parser?: SqlParser,
    clock?: () => Date,
    constrains?: object
  })
}
