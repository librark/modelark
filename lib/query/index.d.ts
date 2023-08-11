export declare abstract class QueryInterface {
  abstract execute (parameters: object): Promise<object>

  protected abstract perform (parameters: object): Promise<object>
}

export declare class Query extends QueryInterface {
  constructor(dependencies?: {
    validator?: Function
  })

  get properties (): object | null

  get schema (): object | null

  execute (parameters: object): Promise<object>

  protected perform (parameters: object): Promise<object>
}
