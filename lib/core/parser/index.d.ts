export declare class DataParser {
  parse (expression: any[], context?: object): Promise<any>
}

export declare class SqlParser {
  constructor(dependencies?: {
    tables?: Array<string>
  })

  parse (expression: any[], context?: object): Promise<[string, any[]]>
}
