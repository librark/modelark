export declare class Environment {
  constructor (context: object)

  surround (item: object): object
}

export declare class Evaluator {
  evaluate (expression: any, environment: Environment): Promise<any>
}

export declare const baseOperators: {
  __namespaces__: string[]
  [operator: string]: any
}
