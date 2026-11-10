export declare class Entity {
  id: string
  status: string
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
  updatedBy: string | null

  static computed: string[]

  static persisted: string[]

  static build<Model extends Entity>(
    this: new (...args: any[]) => Model, attributes?: object): Model

  get transitions(): string[] | undefined

  constructor(attributes?: object)

  transition(intake: object): this

  toJSON(): object

  toStruct(): object
}
