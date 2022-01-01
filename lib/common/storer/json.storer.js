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
    try {
      const file = path.join(this.directory, key, this.collection)
      return JSON.parse(await fs.readFile(`${file}.json`))
    } catch (error) {
      return {}
    }
  }

  /** @param {string} key @param {Object} data */
  async store (key, data) {
    const file = path.join(this.directory, key, this.collection)
    await fs.mkdir(path.parse(file).dir, { recursive: true })
    await fs.writeFile(`${file}.json`, JSON.stringify(data))
  }
}
