export class Connection {
  /** @param {string} statement
   * @param {object} parameters
   * @return {object} */
  async query (statement, parameters) {
    console.assert([statement, parameters])
    return {}
  }
}

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
