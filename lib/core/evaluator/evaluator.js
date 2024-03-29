export class Evaluator {
  async evaluate (expression, environment) {
    if (expression?.constructor === String) {
      for (const prefix of environment.__namespaces__) {
        if (expression.startsWith(prefix)) {
          return environment[prefix][expression.slice(prefix.length)]
        }
      }
      return expression
    } else if (expression?.constructor !== Array) {
      if (expression?.constructor === Object && ('' in expression)) {
        return expression['']
      }
      return expression
    }

    const [operator, ...args] = expression

    if (operator in (environment.__macros__ || {})) {
      return environment.__macros__[operator](
        args, this.evaluate.bind(this), environment)
    }

    const values = []
    for (const arg of args) {
      values.push(await this.evaluate(arg, environment))
    }

    return environment[operator](
      values, this.evaluate.bind(this), environment)
  }
}
