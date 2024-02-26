export declare abstract class Connector {
  query (): Promise<Connection>

  put (connection: Connection): Promise<void>
}

export declare abstract class Connection {
  query (statement: string, parameters: object): Promise<object>
}
