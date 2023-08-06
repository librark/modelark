import { Entity } from '../core/entity/index.js'

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
}
