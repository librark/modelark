import * as path from 'path'
import { Storer } from './storer.js'

export class JsonStorer extends Storer {
  /** @param {{ dir: string, collection: string, disk: object }} */
  constructor ({ directory = 'data', collection = '', disk = null } = {}) {
    super()
    this.directory = directory
    this.collection = collection
    this.disk = disk
  }

  /** @param {string} key @returns {Object} */
  async retrieve (key) {
    const file = `${path.join(this.directory, key, this.collection)}.json`
    await this.disk.mkdir(path.parse(file).dir, { recursive: true })
    let data = {}
    const handle = await this.lockFile(file)
    try { data = JSON.parse(await this.disk.readFile(file)) } catch { }
    await this.unlockFile(file, handle)
    return data
  }

  /** @param {string} key @param {Object} data */
  async store (key, data) {
    const file = `${path.join(this.directory, key, this.collection)}.json`
    await this.disk.mkdir(path.parse(file).dir, { recursive: true })
    const handle = await this.lockFile(file)
    try {
      await this.disk.writeFile(file, JSON.stringify(data, null, 2))
    } catch {}
    await this.unlockFile(file, handle)
  }

  /* istanbul ignore next */
  async lockFile (file) {
    return this.disk.open(`${file}.lock`, this.disk.constants.O_CREAT |
      this.disk.constants.O_EXCL | this.disk.constants.O_RDWR).catch(
      () => this.lockFile(file))
  }

  /* istanbul ignore next */
  async unlockFile (file, handle) {
    await handle?.close()
    return this.disk.unlink(`${file}.lock`).catch(
      () => this.unlockFile(file, handle))
  }
}
