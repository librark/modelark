import { describe, expect, it, beforeEach } from '@jest/globals'
import { Logger } from './logger.js'

const mockGlobal = {
  console: {
    error (...args) { mockGlobal.erroArgs = args },
    warn (...args) { mockGlobal.warnArgs = args },
    info (...args) { mockGlobal.infoArgs = args },
    debug (...args) { mockGlobal.debugArgs = args }
  }
}

describe('Logger', () => {
  let mockGlobal = null

  beforeEach(() => {
    mockGlobal = {
      console: {
        error (...args) { mockGlobal.errorArgs = args },
        warn (...args) { mockGlobal.warnArgs = args },
        info (...args) { mockGlobal.infoArgs = args },
        debug (...args) { mockGlobal.debugArgs = args }
      }
    }
  })

  it('can be instantiated', () => {
    const logger = new Logger()
    expect(logger).toBeTruthy()
  })

  it('is disabled by default', () => {
    const logger = new Logger({ global: mockGlobal })

    logger.error('Logging something...')
    expect(mockGlobal.errorArgs).toBeFalsy()

    logger.warn('Logging something...')
    expect(mockGlobal.warnArgs).toBeFalsy()

    logger.info('Logging something...')
    expect(mockGlobal.infoArgs).toBeFalsy()

    logger.debug('Logging something...')
    expect(mockGlobal.debugArgs).toBeFalsy()
  })

  it('adds a prefix to the logging methods according to loglevel', () => {
    mockGlobal.LOGLEVEL = 'debug'
    const logger = new Logger({ global: mockGlobal })

    logger.error('Logging something...')
    expect(mockGlobal.errorArgs).toEqual(['[ERROR]', 'Logging something...'])

    logger.warn('Logging something...')
    expect(mockGlobal.warnArgs).toEqual(['[WARN]', 'Logging something...'])

    logger.info('Logging something...')
    expect(mockGlobal.infoArgs).toEqual(['[INFO]', 'Logging something...'])

    logger.debug('Logging something...')
    expect(mockGlobal.debugArgs).toEqual(['[DEBUG]', 'Logging something...'])
  })
})

