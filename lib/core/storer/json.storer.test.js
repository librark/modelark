import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs/promises'
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals'
import { JsonStorer } from './json.storer.js'

describe('JsonStorer', () => {
  let storer = /** @type {MemoryStorer} */ (null)
  let directory = null

  beforeEach(async () => {
    const tmpdir = path.join(os.tmpdir(), 'modelarkjs', path.sep)
    try { await fs.mkdir(tmpdir, { recursive: true }) } catch {}
    directory = await fs.mkdtemp(tmpdir)
    const collection = 'orders'
    storer = new JsonStorer({ directory, collection })
  })

  afterEach(async () => {
    await fs.rmdir(directory, { recursive: true })
  })

  it('can be instantiated', () => {
    expect(storer).toBeTruthy()
  })

  it('can be instantiated with default values', () => {
    const storer = new JsonStorer()
    expect(storer.directory).toBe('data')
    expect(storer.collection).toBe('')
  })

  it('holds the given collection string', () => {
    expect(storer.directory).toBe(directory)
    expect(storer.collection).toBe('orders')
  })

  it('defines a "retrieve" method that returns the keyed store', async () => {
    const itemId = 'c0cbea06-2f4b-4bf8-a508-8fe9725cb1cf'
    const storeId = '4d68cd64-d4fd-4d36-adf8-8efefd226a9a'
    const data = {
      [itemId]: { id: itemId, name: 'John Doe' }
    }
    const file = path.join(directory, storeId, storer.collection)
    await fs.mkdir(path.parse(file).dir, { recursive: true })
    await fs.writeFile(`${file}.json`, JSON.stringify(data, null, 2))

    const store = await storer.retrieve(storeId)

    expect(store).toMatchObject(data)
  })

  it('retrieves an empty object if the file is not found', async () => {
    const storeId = '4d68cd64-d4fd-4d36-adf8-8efefd226a9a'

    const store = await storer.retrieve(storeId)

    expect(store).toMatchObject({})
  })

  it('defines an "store" method', async () => {
    const itemId = 'ac283465-2fec-4902-84dd-d497af0aae04'
    const data = {
      [itemId]: {
        id: itemId,
        name: 'John Doe'
      }
    }
    const storeId = '4d68cd64-d4fd-4d36-adf8-8efefd226a9a'

    await storer.store(storeId, data)

    const file = path.join(directory, storeId, storer.collection)
    const store = JSON.parse(await fs.readFile(`${file}.json`))
    expect(store).toEqual(data)
  })
})
