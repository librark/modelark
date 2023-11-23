export declare class Entity {
  id: string
  status: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string

  constructor(attributes: object)

  initialize(attributes: object): this

  transition(state: object): this

  static fields: {
    [field: string]: { type: string, default?: any }
  }

  static structured: boolean
}
