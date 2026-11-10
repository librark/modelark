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
    try {
      return JSON.parse(await this.fs.readFile(file))
    } catch (error) {
      if (error?.code === 'ENOENT') return {}
      throw error
    }
  }

  /** @param {string} key @param {Object} data */
  async store (key, data) {
    const file = `${this.path.join(this.directory, key, this.collection)}.json`
    const temporary = `${file}.tmp`
    await this.fs.mkdir(this.path.parse(file).dir, { recursive: true })
    const handle = await this.lockFile(file)
    try {
      await this.fs.writeFile(temporary, JSON.stringify(data, null, 2))
      await this.fs.rename(temporary, file)
    } finally {
      await this.unlockFile(file, handle)
    }
  }

  async lockFile (file) {
    while (true) {
      try {
        return await this.fs.open(`${file}.lock`, this.fs.constants.O_CREAT |
          this.fs.constants.O_EXCL | this.fs.constants.O_RDWR)
      } catch (error) {
        if (error?.code !== 'EEXIST') throw error
      }
    }
  }

  async unlockFile (file, handle) {
    try {
      await handle?.close()
    } finally {
      await this.fs.unlink(`${file}.lock`).catch(error => {
        if (error?.code !== 'ENOENT') throw error
      })
    }
  }
}
