import { describe, expect, it } from '@jest/globals'
import { uuid, uuid32encode, uuid32decode } from '../../lib/common/common.js'

describe('Common', () => {
  it('offers a "uuid" function', () => {
    const value = uuid()
    expect(value.length).toBe(36)
  })

  it('provides a "uuid" base32 encoder and decoder', () => {
    const values = [
      ['37bc7ccc-18db-4b7b-8e62-5ca437d91e02', 'pnnhuco66r9dtosoiskgrti7g2'],
      ['8cc1a91b-fb9f-4050-8deb-df4378c5bc11', 'sco6khnusv8188rquv8dscbf0h'],
      ['64cf99a7-473f-4595-85f6-e9446ba62c3c', 'r4pucqehpv8maobtn98hlqcb1s'],
      ['ce557088-8dd1-4b3f-b7aa-ce26ffa8ab19', 'uealo8h3eh9cvrfame4rvqhaop'],
      ['8bcc409f-4df7-464f-b465-881ce0010f77', 'sbph09ujfn8p7r8pc83jg023rn']
    ]

    for (const [uuid, base32] of values) {
      const encoded = uuid32encode(uuid)
      expect(encoded.length).toBe(26)
      expect(encoded).toEqual(base32)

      const decoded = uuid32decode(encoded)
      expect(decoded.length).toBe(36)
      expect(decoded).toEqual(uuid)
    }
  })

  it('provides encoding functions returning null on fail', () => {
    expect(uuid32encode('non_uuid')).toBeNull()
    expect(uuid32decode('non_base32')).toBeNull()
    expect(uuid32encode('1078ff3f-132f-458e-84c2-02d743243f2d')).not.toBeNull()
    expect(uuid32decode('ogf3vju4pf8m789gg2qt1i8fpd')).not.toBeNull()
  })
})
