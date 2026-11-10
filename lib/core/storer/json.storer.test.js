import os from 'os'
import fs from 'fs/promises'
import path from 'path'
import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import { JsonStorer } from './json.storer.js'

describe('JsonStorer', () => {
  let storer = null
  let directory = null

  beforeEach(async () => {
    const tmpdir = path.join(os.tmpdir(), 'modelarkjs', path.sep)
    try { await fs.mkdir(tmpdir, { recursive: true }) } catch {}
    directory = await fs.mkdtemp(tmpdir)
    const collection = 'orders'
    storer = new JsonStorer({ directory, collection, fs, path })
  })

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true })
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

  it('retrieves data without creating a lock file', async () => {
    const storeId = '4d68cd64-d4fd-4d36-adf8-8efefd226a9a'
    const file = path.join(directory, storeId, storer.collection)
    await fs.mkdir(path.parse(file).dir, { recursive: true })
    await fs.writeFile(`${file}.json`, JSON.stringify({}, null, 2))

    await storer.retrieve(storeId)

    await expect(fs.access(`${file}.json.lock`)).rejects.toThrow()
  })

  it('retrieves an empty object if the file is not found', async () => {
    const storeId = '4d68cd64-d4fd-4d36-adf8-8efefd226a9a'

    const store = await storer.retrieve(storeId)

    expect(store).toMatchObject({})
  })

  it('rejects malformed JSON instead of treating it as an empty store', async () => {
    const storeId = 'malformed-store'
    const file = path.join(directory, storeId, `${storer.collection}.json`)
    await fs.mkdir(path.parse(file).dir, { recursive: true })
    await fs.writeFile(file, '{ invalid JSON')

    await expect(storer.retrieve(storeId)).rejects.toThrow(SyntaxError)
  })

  it('propagates read failures instead of treating them as an empty store', async () => {
    const error = Object.assign(new Error('Permission denied'), { code: 'EACCES' })
    storer.fs = { ...fs, readFile: jest.fn().mockRejectedValue(error) }

    await expect(storer.retrieve('unreadable-store')).rejects.toBe(error)
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

  it('stores data atomically through a temporary file', async () => {
    const storeId = '4d68cd64-d4fd-4d36-adf8-8efefd226a9a'
    const data = { test: true }
    const temporary = path.join(directory, storeId, `${storer.collection}.json.tmp`)

    await storer.store(storeId, data)

    await expect(fs.access(temporary)).rejects.toThrow()
  })

  it('creates an exclusive lock and closes its handle when releasing it', async () => {
    const file = path.join(directory, 'orders.json')

    const handle = await storer.lockFile(file)
    await expect(fs.access(`${file}.lock`)).resolves.toBeUndefined()
    expect(handle.fd).toBeGreaterThanOrEqual(0)

    await storer.unlockFile(file, handle)

    expect(handle.fd).toBe(-1)
    await expect(fs.access(`${file}.lock`)).rejects.toHaveProperty('code', 'ENOENT')
  })

  it('retries lock acquisition when another writer already holds the lock', async () => {
    const file = path.join(directory, 'orders.json')
    const contention = Object.assign(new Error('Lock exists'), { code: 'EEXIST' })
    const handle = { close: jest.fn() }
    const open = jest.fn()
      .mockRejectedValueOnce(contention)
      .mockResolvedValueOnce(handle)
    storer.fs = { ...fs, open }

    await expect(storer.lockFile(file)).resolves.toBe(handle)

    const flags = fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR
    expect(open.mock.calls).toEqual([
      [`${file}.lock`, flags], [`${file}.lock`, flags]
    ])
  })

  it('propagates lock acquisition errors other than contention without retrying', async () => {
    const failure = Object.assign(new Error('Permission denied'), { code: 'EACCES' })
    const open = jest.fn().mockRejectedValue(failure)
    storer.fs = { ...fs, open }

    await expect(storer.lockFile(path.join(directory, 'orders.json')))
      .rejects.toBe(failure)

    expect(open).toHaveBeenCalledTimes(1)
  })

  it('releases an already closed lock and tolerates a missing lock file', async () => {
    const file = path.join(directory, 'orders.json')
    await fs.writeFile(`${file}.lock`, '')

    await expect(storer.unlockFile(file)).resolves.toBeUndefined()
    await expect(storer.unlockFile(file)).resolves.toBeUndefined()

    await expect(fs.access(`${file}.lock`)).rejects.toHaveProperty('code', 'ENOENT')
  })

  it('propagates unlink errors without retrying or closing the handle again', async () => {
    const file = path.join(directory, 'orders.json')
    const failure = Object.assign(new Error('Unlink unavailable'), { code: 'EIO' })
    const handle = { close: jest.fn().mockResolvedValue(undefined) }
    const unlink = jest.fn().mockRejectedValue(failure)
    storer.fs = { ...fs, unlink }

    await expect(storer.unlockFile(file, handle)).rejects.toBe(failure)

    expect(handle.close).toHaveBeenCalledTimes(1)
    expect(unlink).toHaveBeenCalledTimes(1)
    expect(unlink).toHaveBeenCalledWith(`${file}.lock`)
  })

  it('attempts to remove the lock even when closing its handle fails', async () => {
    const file = path.join(directory, 'orders.json')
    const failure = new Error('Close unavailable')
    const handle = { close: jest.fn().mockRejectedValue(failure) }
    const unlink = jest.fn().mockResolvedValue(undefined)
    storer.fs = { ...fs, unlink }

    await expect(storer.unlockFile(file, handle)).rejects.toBe(failure)

    expect(handle.close).toHaveBeenCalledTimes(1)
    expect(unlink).toHaveBeenCalledWith(`${file}.lock`)
  })

  it.each(['writeFile', 'rename'])(
    'preserves stored data and releases its lock when %s fails',
    async operation => {
      const storeId = 'failed-write'
      const file = path.join(directory, storeId, `${storer.collection}.json`)
      const previous = { O001: { id: 'O001', name: 'Original' } }
      await storer.store(storeId, previous)
      const failure = Object.assign(new Error(`${operation} unavailable`), { code: 'EIO' })
      const mutate = jest.fn().mockRejectedValue(failure)
      storer.fs = { ...fs, [operation]: mutate }

      await expect(storer.store(storeId, { O002: { id: 'O002' } })).rejects.toBe(failure)

      expect(mutate).toHaveBeenCalledTimes(1)
      expect(JSON.parse(await fs.readFile(file))).toEqual(previous)
      await expect(fs.access(`${file}.lock`)).rejects.toHaveProperty('code', 'ENOENT')
    })

  it('does not attempt to write data when acquiring the lock fails', async () => {
    const failure = Object.assign(new Error('Permission denied'), { code: 'EACCES' })
    const open = jest.fn().mockRejectedValue(failure)
    const writeFile = jest.fn()
    const rename = jest.fn()
    storer.fs = { ...fs, open, writeFile, rename }

    await expect(storer.store('locked-store', {})).rejects.toBe(failure)

    expect(open).toHaveBeenCalledTimes(1)
    expect(writeFile).not.toHaveBeenCalled()
    expect(rename).not.toHaveBeenCalled()
  })

  it.each(['retrieve', 'store'])(
    'propagates directory creation failures before %s can read or write',
    async operation => {
      const failure = Object.assign(new Error('Permission denied'), { code: 'EACCES' })
      const mkdir = jest.fn().mockRejectedValue(failure)
      const readFile = jest.fn()
      const open = jest.fn()
      storer.fs = { ...fs, mkdir, readFile, open }

      await expect(storer[operation]('inaccessible-store', {})).rejects.toBe(failure)

      expect(readFile).not.toHaveBeenCalled()
      expect(open).not.toHaveBeenCalled()
    })

  it('releases the lock when data cannot be serialized', async () => {
    const storeId = 'circular-store'
    const file = path.join(directory, storeId, `${storer.collection}.json`)
    const data = {}
    data.self = data

    await expect(storer.store(storeId, data)).rejects.toThrow(TypeError)

    await expect(fs.access(`${file}.lock`)).rejects.toHaveProperty('code', 'ENOENT')
  })
})
