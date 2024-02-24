export declare abstract class Connector {
  query (): Promise<Connection>

  put (connection: Connection): Promise<void>
}

export declare interface Connection {
  query (statement: string, parameters: object): Promise<object>
}
