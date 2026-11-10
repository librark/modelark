// @ts-check
// Compile-only declaration checks.
// tsc --noEmit --strict --allowJs --checkJs --target ES2022 --module NodeNext --moduleResolution NodeNext lib/repository/fixtures/*.types.js
import * as api from '../../index.js'
import * as core from '../../core/index.js'
import * as repositories from '../index.js'
import * as queries from '../../query/index.js'
import { baseOperators } from '../../core/evaluator/index.js'

// Keep each barrel's declared value exports aligned with its JavaScript barrel.
/** @type {typeof core} */
const coreExports = {
  Connection: api.Connection,
  Connector: api.Connector,
  DataParser: api.DataParser,
  DefaultLocator: api.DefaultLocator,
  Entity: api.Entity,
  Environment: api.Environment,
  Evaluator: api.Evaluator,
  Filterer: api.Filterer,
  JsonStorer: api.JsonStorer,
  Locator: api.Locator,
  MemoryStorer: api.MemoryStorer,
  Registry: api.Registry,
  Sorter: api.Sorter,
  SqlFilterer: api.SqlFilterer,
  SqlParser: api.SqlParser,
  Storer: api.Storer,
  camelToSnake: api.camelToSnake,
  dedent: api.dedent,
  snakeToCamel: api.snakeToCamel,
  uuid: api.uuid,
  uuid32decode: api.uuid32decode,
  uuid32encode: api.uuid32encode
}
/** @type {typeof repositories} */
const repositoryExports = {
  JsonRepository: api.JsonRepository,
  Linker: api.Linker,
  MemoryRepository: api.MemoryRepository,
  OrdinaryLinker: api.OrdinaryLinker,
  Portal: api.Portal,
  Repository: api.Repository,
  SqlLinker: api.SqlLinker,
  SqlRepository: api.SqlRepository
}
/** @type {typeof queries} */
const queryExports = {
  Query: api.Query,
  QueryInterface: api.QueryInterface
}
/** @type {typeof api} */
const publicExports = {
  ...coreExports, ...repositoryExports, ...queryExports
}

class Model extends api.Entity {
  name = ''
}

class TestConnector extends api.Connector {
  async get () { return new api.Connection() }

  /** @param {api.Connection} _connection */
  async put (_connection) {}
}

/** @type {Model} */
const model = Model.build()
const defaultEntity = new api.Entity()
/** @type {string | null} */
const creator = defaultEntity.createdBy
/** @type {string[] | undefined} */
const transitions = defaultEntity.transitions
Model.persisted = ['name']
/** @type {api.Connector} */
const connector = new TestConnector()
/** @type {Promise<api.Connection>} */
const connection = connector.get()
const locator = new api.DefaultLocator({ location: 'tenant', reference: 'user' })
const parser = new api.DataParser()
const sqlParser = new api.SqlParser({ tables: ['Model'] })
const sorter = new api.Sorter()
const memoryStorer = new api.MemoryStorer({ data: [model] })
const jsonStorer = new api.JsonStorer({ directory: 'data', collection: 'Model' })
const memory = new api.MemoryRepository({
  model: Model,
  locator,
  parser,
  storer: memoryStorer,
  sorter,
  clock: () => new Date()
})
const json = new api.JsonRepository({
  model,
  locator,
  parser,
  sorter,
  directory: 'data',
  collection: 'Model',
  fs: {},
  path: {}
})
const sql = new api.SqlRepository({
  model: Model, collection: 'Model', locator, connector, parser: sqlParser
})
/** @type {api.OrdinaryLinker} */
const ordinary = new api.OrdinaryLinker().setup([memory])
/** @type {api.SqlLinker} */
const linkedSql = new api.SqlLinker({ locator, connector }).setup([sql])
const portal = new api.Portal({ repositories: [sql], linker: linkedSql })
const registry = new api.Registry({ resources: [model] })
registry.set(model)
registry.get(Model)
registry.get(model)
registry.get({ name: 'Model' })
const environment = new api.Environment(baseOperators)
/** @type {Promise<any>} */
const evaluated = new api.Evaluator().evaluate('literal', environment)
/** @type {Promise<any>} */
const parsed = parser.parse(true)
/** @type {Promise<[string | null, any]>} */
const sqlParsed = sqlParser.parse(1)
/** @type {() => Promise<[string | null, any]>} */
const sqlFilter = new api.SqlFilterer().parse(['=', ':id', model.id])
/** @type {(record: object) => Promise<any>} */
const filter = new api.Filterer().parse(['=', ':id', model.id])
/** @type {(schema: object, value: object) => object} */
const validator = (_schema, value) => value
const query = new api.Query({ validator })
/** @type {Promise<object>} */
const executed = query.execute({})
/** @type {string} */
const identifier = api.uuid()
/** @type {string | null} */
const encoded = api.uuid32encode(identifier)
/** @type {string | null} */
const decoded = api.uuid32decode(encoded ?? '')
/** @type {string[]} */
const formatted = [api.camelToSnake('aB'), api.snakeToCamel('a_b'), api.dedent('text')]
/** @type {Promise<Model>} */
const added = portal.add(model)
/** @type {Promise<Model | null>} */
const removed = portal.remove(model)
const ordinaryQuery = ordinary.query([], null)
const linkedSqlQuery = linkedSql.query([], null)
const portalQuery = portal.query([], null)

// @ts-expect-error This runtime interface is not exported by the public barrel.
const missingInterface = api.RepositoryInterface
// @ts-expect-error The connector API retrieves connections through get().
connector.query()
// @ts-expect-error SqlLinker requires a locator implementation.
const invalidLocator = new api.SqlLinker({ locator: 'tenant', connector })
// @ts-expect-error SqlLinker requires a connector implementation.
const invalidConnector = new api.SqlLinker({ locator, connector: {} })
// @ts-expect-error SqlFilterer has no constructor options.
const invalidFilterer = new api.SqlFilterer({ tables: ['Model'] })
// @ts-expect-error Repository constraints were never implemented.
const invalidConstraints = new api.MemoryRepository({ constrains: {} })

export {
  publicExports, core, repositories, queries, creator, transitions, connection,
  jsonStorer, json, ordinaryQuery, linkedSqlQuery, portalQuery, evaluated,
  parsed, sqlParsed, sqlFilter, filter, executed, decoded, formatted, added,
  removed, missingInterface, invalidLocator, invalidConnector, invalidFilterer,
  invalidConstraints
}
