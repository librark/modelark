export declare abstract class Connector {
  get (): Promise<Connection>

  put (connection: Connection): Promise<void>
}

export declare class Connection {
  query (statement: string, parameters: object): Promise<object>
}
