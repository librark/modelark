export declare abstract class Storer {
  retrieve (key: string): Promise<object>

  store (key: string, data: object): Promise<void>

  load (key: string, data: object, field?: string): void
}

export declare class MemoryStorer extends Storer {
  constructor(dependencies?: {
    data?: object,
    field?: string
  })
}

export declare class JsonStorer extends Storer {
  constructor(dependencies?: {
    directory?: string,
    collection?: string,
    fs?: object,
    path?: object
  })
}
