export declare abstract class Abstract {
  protected abstract<Type>(
    parameters: {[key: string]: any} | any[],
    returnType: Type): InstanceType<Type>
  protected abstract(
    parameters: {[key: string]: any} | any[]): void
}
