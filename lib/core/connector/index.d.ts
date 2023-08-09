export declare interface Connection {
  query (statement: string, parameters: object): Promise<object>
}

export declare interface Connector {
  query (): Promise<Connection>

  put (connection: Connection): Promise<void>
}
