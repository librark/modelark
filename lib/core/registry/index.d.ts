export declare class Registry {
  constructor(dependencies?: {
    resources?: object | Array<object>,
    check?: boolean
  })

  get (name: string): any

  set (resource: object | Array<object>, key: string): void

  map (resource: object | Array<object>): void

  keys (): Array<string>

  values (): Array<any>

  entries (): Array<[string, any]>
}
