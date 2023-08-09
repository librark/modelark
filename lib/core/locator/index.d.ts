export declare abstract class Locator {
  reference (): string
  location (): string
}

export declare class DefaultLocator extends Locator {
  constructor(dependencies?: {
    reference?: string,
    location?: string,
  })
}
