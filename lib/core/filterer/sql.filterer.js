import { SqlParser } from '../parser/index.js'

export class SqlFilterer {
  constructor () {
    this.parser = new SqlParser()
  }

  parse (expression) {
    return async () => {
      return this.parser.parse(expression)
    }
  }
}
