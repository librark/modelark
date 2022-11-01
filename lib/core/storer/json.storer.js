import { Storer } from './storer.js'

export class JsonStorer extends Storer {
  /** @param {{ dir: string, collection: string, fs: object, path: object }} */
  constructor ({
    directory = 'data', collection = '', fs = null, path = null
  } = {}) {
    super()
    this.directory = directory
    this.collection = collection
    this.fs = fs
    this.path = path
  }

  /** @param {string} key @returns {Object} */
  async retrieve (key) {
    const file = `${this.path.join(this.directory, key, this.collection)}.json`
    await this.fs.mkdir(this.path.parse(file).dir, { recursive: true })
    let data = {}
    const handle = await this.lockFile(file)
    try { data = JSON.parse(await this.fs.readFile(file)) } catch { }
    await this.unlockFile(file, handle)
    return data
  }

  /** @param {string} key @param {Object} data */
  async store (key, data) {
    const file = `${this.path.join(this.directory, key, this.collection)}.json`
    await this.fs.mkdir(this.path.parse(file).dir, { recursive: true })
    const handle = await this.lockFile(file)
    try {
      await this.fs.writeFile(file, JSON.stringify(data, null, 2))
    } catch {}
    await this.unlockFile(file, handle)
  }

  /* istanbul ignore next */
  async lockFile (file) {
    return this.fs.open(`${file}.lock`, this.fs.constants.O_CREAT |
      this.fs.constants.O_EXCL | this.fs.constants.O_RDWR).catch(
      () => this.lockFile(file))
  }

  /* istanbul ignore next */
  async unlockFile (file, handle) {
    await handle?.close()
    return this.fs.unlink(`${file}.lock`).catch(
      () => this.unlockFile(file, handle))
  }
}
