export declare class Abstract {
  _abstract<Type>(
    parameters: {[key: string]: any} | any[],
    returnType: Type): InstanceType<Type>
  _abstract(
    parameters: {[key: string]: any} | any[]): void
}
