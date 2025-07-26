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
  get model (): new (...args: any[]) => Model

  get collection (): string

  add (items: Model): Promise<Model>
  add (items: Array<Model>): Promise<Array<Model>>

  remove (items: Model): Promise<Model>
  remove (items: Array<Model>): Promise<Array<Model>>

  query (expression: Array<any>, context?: object): Promise<any>

  search (
    condition?: Array<any>,
    segment?: {
      limit?: number, offset?: number, order?: string, lock?: boolean | string
    }
  ): Promise<Array<Model>>
  search (
    condition?: Array<any>,
    segment?: {
      limit?: number, offset?: number, order?: string,
      lock?: boolean | string, index: boolean | string
    }
  ): Promise<{[key: string]: Model}>

  find (
    values: Array<any>,
    options?: {
      field?: string, init?: boolean, lock?: boolean | string,
      error?: string | Error
    }
  ): Promise<Array<Model>>
  find (
    values: any,
    options?: {
      field?: string, init?: boolean, lock?: boolean | string,
      error?: string | Error
    }
  ): Promise<Model>
  find (
    values: Array<any>,
    options?: {
      field?: string, init?: boolean, lock?: boolean | string,
      error?: string | Error, many: boolean
    } & { many: true }
  ): Promise<Array<Array<Model>>>
  find (
    values: any,
    options?: {
      field?: string, init?: boolean, lock?: boolean | string,
      error?: string | Error, many: boolean
    } & { many: true }
  ): Promise<Array<Model>>
  find (
    values: any,
    options?: {
      field?: string, init?: boolean, lock?: boolean | string,
      error?: string | Error, dict: boolean
    } & { dict: true }
  ): Promise<{[key: string]: Model}>
  find (
    values: any,
    options?: {
      field?: string, init?: boolean, lock?: boolean | string,
      error?: string | Error, many: boolean, dict: boolean
    } & { many: true, dict: true }
  ): Promise<{[key: string]: Array<Model>}>

  create (items: Array<any>): Array<Model>
  create (items: any): Model

  ensure (
    values: Array<any>,
    options: { field: string, update?: boolean | string[] }
  ): Promise<Array<Model>>
  ensure (
    values: any,
    options: { field: string, update?: boolean | string[] }
  ): Promise<Model>

  load (items: Array<any>): Array<Model>
  load (items: any): Model
}

export declare class MemoryRepository<Model extends Entity>
extends Repository<Model> {
  constructor(dependencies?: {
    model?: Model | (new (...args: any[]) => Model),
    locator?: Locator,
    parser?: DataParser,
    storer?: Storer,
    sorter?: Sorter,
    clock?: () => Date,
    constrains?: any
  })
}

export declare class JsonRepository<Model extends Entity>
extends MemoryRepository<Model> {
  constructor(dependencies?: {
    model?: Model | (new (...args: any[]) => Model),
    locator?: Locator,
    parser?: DataParser,
    sorter?: Sorter,
    clock?: () => Date,
    constrains?: any,
    directory?: string,
    collection?: string,
    fs?: any,
    path?: any
  })
}

export declare class SqlRepository<Model extends Entity>
extends Repository<Model> {
  constructor(dependencies?: {
    model?: Model | (new (...args: any[]) => Model),
    collection?: string,
    locator?: Locator,
    connector?: Connector,
    parser?: SqlParser,
    clock?: () => Date,
    constrains?: any
  })
}

export declare class SqlsonRepository<Model extends Entity>
extends SqlRepository<Model> {}

export declare abstract class Linker {
  abstract setup (repositories: Array<Repository<Entity>>): void

  abstract query (expression: Array<any>, context?: object): Promise<any>
}

export declare class OrdinaryLinker extends Linker {
  setup (repositories: Array<Repository<Entity>>): void

  query (expression: Array<any>, context?: object): Promise<any>
}

export declare class SqlLinker extends Linker {
  constructor ({
    locator: Locator,
    connector: Connector
  })

  setup (repositories: Array<Repository<Entity>>): void

  query (expression: Array<any>, context?: object): Promise<any>
}

type Relation<R extends Entity> = new (...args: any[]) => R;
export declare class Portal extends Registry {
  constructor(dependencies?: {
    repositories?: Array<Repository<Entity>>,
    check?: boolean,
    linker?: Linker
  })

  get<Model extends Entity> (
    name: new (...args: any[]) => Model): Repository<Model>
  get (name: string): Repository<Entity>

  set (resource: Repository<Entity> | Array<Repository<Entity>>): void

  query (expression: Array<any>, context?: object): Promise<any>

  join<Left extends Entity, Join extends Entity, Right extends Entity> (
    models: [
      (new (...args: any[]) => Left),
      (new (...args: any[]) => Join),
      (new (...args: any[]) => Right)
    ],
    options?: {
      conditions?: Array<any[]>,
      segments?: Array<any>,
      key?: string
    }
  ): Promise<Array<[Left, Array<[Join, Right]>]>>
  join<Left extends Entity, Right extends Entity> (
    models: [
      (new (...args: any[]) => Left),
      (new (...args: any[]) => Right)
    ],
    options?: {
      conditions?: Array<any[]>,
      segments?: Array<any>,
      key?: string
    }
  ): Promise<Array<[Left, Array<Right>]>>
  join(
    models: Array<any>,
    options?: {
      conditions?: Array<any[]>,
      segments?: Array<any>,
      key?: string
    }
  ): Promise<Array<any>>

  gather<Model extends Entity, Relations extends Relation<Entity>[]>(
    model: (new (...args: any[]) => Model),
    condition: Array<any>,
    join: [...Relations],
  ): Promise<[Model, ...{[K in keyof Relations]: Relations[K] extends
    Relation<infer Instance> ? Instance : never}][]>
}
