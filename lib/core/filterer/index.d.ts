export declare class Filterer {
  parse (expression: any[]): (object: any) => Promise<any>
}

export declare class SqlFilterer {
  parse (expression: any[]): () => Promise<[string | null, any]>
}
