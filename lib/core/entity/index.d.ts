export declare class Entity {

  static fields: { [field: string]: { type: string, default?: any } }
  static structured: boolean

  id: string
  status: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string

  transitions: string[]

  constructor(attributes: object)

  initialize(attributes: object): this

  transition(state: object): this

  toJSON(): object

  toStruct(): object
}
