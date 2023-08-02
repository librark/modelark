export declare class Entity {
  constructor(attributes: object)

  transition(state: object): this
}

export declare class Abstract {
  _abstract<Type>(
    parameters: {[key: string]: any} | any[],
    returnType: Type): InstanceType<Type>
  _abstract(
    parameters: {[key: string]: any} | any[]): void
}

export * from './core/index.d.ts'
