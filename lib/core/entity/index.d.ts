export declare class Entity {
  id: string
  status: string
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string

  static computed: string[]

  get transitions(): string[]

  constructor(attributes: object)

  transition(state: object): this

  toJSON(): object

  toStruct(): object
}
