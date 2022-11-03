import { describe, expect, it, beforeEach } from '@jest/globals'
import {
  dedent, Connector, Connection, DefaultLocator, Entity
} from '../../lib/core/index.js'
import { RestRepository } from './rest.repository.js'

describe('RestRepository', () => {
  let repository = null

  beforeEach(function () {
    repository = new RestRepository({ })
  })

  it('can be instantiated', function () {
    const repository = new RestRepository()
    expect(repository).toBeTruthy()
  })
})
