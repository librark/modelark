export declare class Filterer {
  parse (expression: any[]): (object: any) => Promise<any>
}

export declare class SqlFilterer {
  constructor(dependencies?: { tables?: Array<string> })

  parse (expression: any[]): Promise<[string, any[]]>
}
