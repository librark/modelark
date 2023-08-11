import { Connector } from '../core/connector/index.js'
import { DataParser } from '../core/parser/index.js'
import { Entity } from '../core/entity/index.js'
import { Locator } from '../core/locator/index.js'
import { Registry } from '../core/registry/index.js'
import { Sorter } from '../core/sorter/index.js'
import { SqlParser } from '../core/parser/index.js'
import { Storer } from '../core/storer/index.js'

export declare abstract class RepositoryInterface<Model extends Entity> {
  abstract add (items: Model): Promise<Model>
  abstract add (items: Array<Model>): Promise<Array<Model>>

  abstract remove (items: Model): Promise<Model>
  abstract remove (items: Array<Model>): Promise<Array<Model>>

  abstract query (expression: Array<any>, context?: object): Promise<any>
}

export declare abstract class Repository<Model extends Entity>
extends RepositoryInterface<Model> {
  get model (): Model

  get collection (): string

  add (items: Model): Promise<Model>
  add (items: Array<Model>): Promise<Array<Model>>

  remove (items: Model): Promise<Model>
  remove (items: Array<Model>): Promise<Array<Model>>

  query (expression: Array<any>, context?: object): Promise<any>

  search (
    condition: Array<any>,
    segment?: { limit?: number, offset?: number, order?: string }
  ): Promise<Array<Model>>

  find (
    values: object,
    options?: { field?: string, init?: boolean }
  ): Promise<Model>
  find (
    values: Array<object>,
    options?: { field?: string, init?: boolean }
  ): Promise<Array<Model>>
  find (
    values: object | Array<object>,
    options?: {
      field?: string, init?: boolean, many?: boolean
    } & { many: true }
  ): Promise<Array<Array<Model>>>

  create (items: Array<object>): Array<Model>
  create (items: object): Model

  ensure (
    values: object,
    options: { field: string }
  ): Promise<Model>
  ensure (
    values: Array<object>,
    options: { field: string }
  ): Promise<Array<Model>>
}

export declare class MemoryRepository<Model extends Entity>
extends Repository<Model> {
  constructor(dependencies?: {
    model?: Model,
    locator?: Locator,
    parser?: DataParser,
    storer?: Storer,
    sorter?: Sorter,
    clock?: () => Date,
    constrains?: object
  })

  load (items: Array<object>): Array<Model>
  load (items: object): Model
}

export declare class JsonRepository<Model extends Entity>
extends MemoryRepository<Model> {
  constructor(dependencies?: {
    model?: Model,
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

export declare class SqlRepository<Model extends Entity>
extends Repository<Model> {
  constructor(dependencies?: {
    model?: Model,
    collection?: string,
    locator?: Locator,
    connector?: Connector,
    parser?: SqlParser,
    clock?: () => Date,
    constrains?: object
  })
}

export declare class SqlsonRepository<Model extends Entity>
extends SqlRepository<Model> {}

export declare abstract class Linker {
  abstract setup (repositories: Array<Repository<Entity>>): void

  abstract query (expression: Array<any>): Promise<any>
}

export declare class OrdinaryLinker extends Linker {
  setup (repositories: Array<Repository<Entity>>): void

  query (expression: Array<any>): Promise<any>
}

export declare class SqlLinker extends Linker {
  constructor ({
    locator: Locator,
    connector: Connector
  })

  setup (repositories: Array<Repository<Entity>>): void

  query (expression: Array<any>): Promise<any>
}

export declare class Portal extends Registry {
  constructor(dependencies?: {
    repositories?: Array<Repository<Entity>>,
    check?: boolean,
    linker?: Linker
  })

  get<Model extends Entity> (name: Model): Repository<Model>
  get (name: string): Repository<Entity>

  set (resource: Repository<Entity> | Array<Repository<Entity>>): void

  query (expression: Array<any>): Promise<any>
}
