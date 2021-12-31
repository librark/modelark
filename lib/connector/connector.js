/**
 * @typedef { import("./connection.js").Connection } Connection
 */

export class Connector {
  /** @return {Connection} */
  async get () {
    throw new Error('Not implemented')
  }

  /** @param {Connection} */
  async put (connection) {
    console.assert([connection])
    throw new Error('Not implemented')
  }
}
