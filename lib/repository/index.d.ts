import { Entity } from '../core/entity/index.js'
import { Locator } from '../core/locator/index.js'
import { DataParser } from '../core/parser/index.js'
import { Storer } from '../core/storer/index.js'
import { Sorter } from '../core/sorter/index.js'

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
