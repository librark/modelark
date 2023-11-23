export declare class Entity {
  id: string
  status: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string

  constructor(attributes: object)

  transition(state: object): this

  static fields: {
    [field: string]: { type: string, default?: any }
  }

  static structured: boolean
}
