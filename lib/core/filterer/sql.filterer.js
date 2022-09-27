export class SqlFilterer {
  constructor () {
    this.comparisonOperators = {
      '=': (x, y) => `${x} = ${y}`,
      '!=': (x, y) => `${x} <> ${y}`,
      '<=': (x, y) => `${x} <= ${y}`,
      '<': (x, y) => `${x} < ${y}`,
      '>': (x, y) => `${x} > ${y}`,
      '>=': (x, y) => `${x} >= ${y}`,
      in: (x, y) => `${x} = ANY(${y})`,
      like: (x, y) => `${x} LIKE ${y}`,
      ilike: (x, y) => `${x} ILIKE ${y}`,
      contains: (x, y) => `${y} = ANY(${x})`
    }

    this.binaryOperators = {
      '&': (x, y) => `${x} AND ${y}`,
      '|': (x, y) => `${x} OR ${y}`
    }

    this.unaryOperators = {
      '!': (x) => `NOT ${x}`
    }

    this.defaultJoinOperator = '&'
  }

  parse (domain) {
    if (!domain || !domain.length) {
      return ['1 = 1', []]
    }

    let stack = []
    let position = 0
    const parameters = []
    const terms = domain.filter(term => typeof term !== 'string').length
    for (const item of domain.reverse()) {
      if (item in this.binaryOperators) {
        const firstOperand = stack.pop()
        const secondOperand = stack.pop()
        const stringTerm = this.binaryOperators[item.toString()](
          firstOperand, secondOperand)
        stack.push(stringTerm)
      } else if (item in this.unaryOperators) {
        const operand = stack.pop()
        stack.push(this.unaryOperators[item.toString()](operand))
      }

      stack = this._defaultJoin(stack)

      if (item instanceof Array) {
        const [condition, parameter] = this._parseTuple(
          item, terms - position)
        stack.push(condition)
        parameters.push(parameter)
        position += 1
      }
    }

    const query = this._defaultJoin(stack)[0]

    return [query, parameters.reverse()]
  }

  _parseTuple (tuple, position = 1) {
    const [field, operator, value] = tuple
    const comparer = this.comparisonOperators[operator]
    const placeholder = `$${position}`
    const result = [comparer(`"${field}"`, placeholder), value]

    return result
  }

  _defaultJoin (stack) {
    const operator = this.defaultJoinOperator

    if (stack && (stack.length === 2)) {
      const firstOperand = stack.pop()
      const secondOperand = stack.pop()
      const value = this.binaryOperators[operator](
        firstOperand, secondOperand)
      stack.push(value)
    }

    return stack
  }
}
