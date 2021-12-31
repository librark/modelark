export class Filterer {
  constructor () {
    this.comparisonOperators = {
      '=': (field, value) => (obj) => obj[field] === value,
      '!=': (field, value) => (obj) => obj[field] !== value,
      '>': (field, value) => (obj) => obj[field] > value,
      '<': (field, value) => (obj) => obj[field] < value,
      '>=': (field, value) => (obj) => obj[field] >= value,
      '<=': (field, value) => (obj) => obj[field] <= value,
      in: (field, value) => (obj) => (value.includes(obj[field])),
      contains: (field, value) => (obj) => (obj[field].includes(value)),
      like: (field, value) => {
        const regex = RegExp(`^${value}$`.replace(
          /%/g, '.*').replace(/_/g, '.'))
        const filter = (obj) => regex.test(obj[field])
        return filter
      },
      ilike: (field, value) => {
        const regex = RegExp(`^${value}$`.replace(
          /%/g, '.*').replace(/_/g, '.').toLowerCase())
        const filter = (obj) => regex.test(obj[field].toLowerCase())
        return filter
      }
    }
    this.binaryOperators = {
      '&': (expression1, expression2) =>
        (obj) => expression1(obj) && expression2(obj),
      '|': (expression1, expression2) =>
        (obj) => expression1(obj) || expression2(obj)
    }
    this.unaryOperators = {
      '!': (expression1) =>
        (obj) => !expression1(obj)
    }
    this.defaultJoinOperator = '&'
  }

  parse (domain) {
    if (!domain || !domain.length) {
      return (_) => true
    }
    let stack = []
    for (const item of domain.reverse()) {
      if (item in this.binaryOperators) {
        const firstOperand = stack.pop()
        const secondOperand = stack.pop()
        const resultFunction = this.binaryOperators[item.toString()](
          firstOperand, secondOperand)
        stack.push(resultFunction)
      } else if (item in this.unaryOperators) {
        const operand = stack.pop()
        stack.push(this.unaryOperators[item.toString()](operand))
      }
      stack = this._defaultJoin(stack)

      if (item instanceof Array) {
        const resultTupleFunction = this._parseTuple(item)
        stack.push(resultTupleFunction)
      }
    }
    const result = this._defaultJoin(stack)[0]

    return result
  }

  _parseTuple (termTuple) {
    const field = termTuple[0]
    const operator = termTuple[1]
    const value = termTuple[2]

    const parseFactory = this.comparisonOperators[operator]
    const parseFunction = parseFactory(field, value)

    return parseFunction
  }

  _defaultJoin (stack) {
    const operator = this.defaultJoinOperator
    const stackLength = stack.length

    if (stack && (stackLength === 2)) {
      const firstOperand = stack.pop()
      const secondOperand = stack.pop()

      const resultFunction = this.binaryOperators[operator](
        firstOperand, secondOperand)
      stack.push(resultFunction)
    }

    return stack
  }
}
