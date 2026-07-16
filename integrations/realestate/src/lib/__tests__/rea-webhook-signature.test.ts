import { describe, expect, it } from '@jest/globals'
import {
  cacheSigningKeys,
  isSignatureTimestampValid,
  parseReaSignatureHeader,
  resetSigningKeyCache,
} from '../rea-webhook-signature'

describe('parseReaSignatureHeader', () => {
  it('parses x-rea-signature header parts', () => {
    const parsed = parseReaSignatureHeader(
      's:512bcc40-2aab-4cb7-9810-58a3dd8fa418:1764308232:1764308232:21V9TDeXDkrCSoLGD6XrOSBNcyT5KuZNeC2u/Pkmi/Y0MuvrQ2bRTJR25uks8jgNI/Re0JY+E5NR+C+53kBODQ==',
    )

    expect(parsed).toEqual({
      keyId: '512bcc40-2aab-4cb7-9810-58a3dd8fa418',
      timestamp: 1764308232,
      signatureBase64:
        '21V9TDeXDkrCSoLGD6XrOSBNcyT5KuZNeC2u/Pkmi/Y0MuvrQ2bRTJR25uks8jgNI/Re0JY+E5NR+C+53kBODQ==',
    })
  })

  it('returns null for invalid header', () => {
    expect(parseReaSignatureHeader('invalid')).toBeNull()
  })
})

describe('isSignatureTimestampValid', () => {
  it('accepts timestamps within eight hours', () => {
    expect(isSignatureTimestampValid(1_000_000, 1_000_100)).toBe(true)
  })

  it('rejects timestamps older than eight hours', () => {
    expect(isSignatureTimestampValid(1_000_000, 1_030_000)).toBe(false)
  })
})

describe('cacheSigningKeys', () => {
  it('stores keys by kid', () => {
    resetSigningKeyCache()
    cacheSigningKeys([
      {
        kty: 'OKP',
        use: 'sig',
        crv: 'Ed25519',
        kid: 'key-1',
        x: 'abc=',
      },
    ])

    expect(parseReaSignatureHeader('s:key-1:1:1:sig==')).toEqual({
      keyId: 'key-1',
      timestamp: 1,
      signatureBase64: 'sig==',
    })
  })
})
