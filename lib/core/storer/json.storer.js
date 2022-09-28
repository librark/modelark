import * as path from 'path'
import * as fs from 'fs/promises'
import { Storer } from './storer.js'

export class JsonStorer extends Storer {
  /** @param {{ dir: string, collection: string }} */
  constructor ({ directory = 'data', collection = '' } = {}) {
    super()
    this.directory = directory
    this.collection = collection
  }

  /** @param {string} key @returns {Object} */
  async retrieve (key) {
    const file = `${path.join(this.directory, key, this.collection)}.json`
    await fs.mkdir(path.parse(file).dir, { recursive: true })
    let data = {}
    await lockFile(file)
    try { data = JSON.parse(await fs.readFile(file)) } catch { }
    await unlockFile(file)
    return data
  }

  /** @param {string} key @param {Object} data */
  async store (key, data) {
    const file = `${path.join(this.directory, key, this.collection)}.json`
    await fs.mkdir(path.parse(file).dir, { recursive: true })
    await lockFile(file)
    try { await fs.writeFile(file, JSON.stringify(data)) } catch {}
    await unlockFile(file)
  }
}

const lockFile = file => {
  /* istanbul ignore next */
  return fs.open(`${file}.lock`, fs.constants.O_CREAT | fs.constants.O_EXCL |
    fs.constants.O_RDWR).catch(() => lockFile(file))
}

const unlockFile = file => {
  /* istanbul ignore next */
  return fs.unlink(`${file}.lock`).catch(() => unlockFile(file))
}
