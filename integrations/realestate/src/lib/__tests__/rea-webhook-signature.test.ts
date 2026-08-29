import { describe, expect, it } from '@jest/globals'
import { Buffer } from 'node:buffer'
import * as ed from '@noble/ed25519'
import {
  cacheSigningKeys,
  decodeReaBase64,
  isSignatureTimestampValid,
  parseReaSignatureHeader,
  resetSigningKeyCache,
  verifyReaWebhookSignature,
} from '../rea-webhook-signature'

const FIVE_PART_SAMPLE =
  's:512bcc40-2aab-4cb7-9810-58a3dd8fa418:1764308232:1764308232:21V9TDeXDkrCSoLGD6XrOSBNcyT5KuZNeC2u/Pkmi/Y0MuvrQ2bRTJR25uks8jgNI/Re0JY+E5NR+C+53kBODQ=='
const FOUR_PART_SAMPLE =
  's:512bcc40-2aab-4cb7-9810-58a3dd8fa418:1764308232:21V9TDeXDkrCSoLGD6XrOSBNcyT5KuZNeC2u/Pkmi/Y0MuvrQ2bRTJR25uks8jgNI/Re0JY+E5NR+C+53kBODQ=='

describe('parseReaSignatureHeader', () => {
  it('parses the 5-part REA docs sample (duplicate timestamp)', () => {
    expect(parseReaSignatureHeader(FIVE_PART_SAMPLE)).toEqual({
      keyId: '512bcc40-2aab-4cb7-9810-58a3dd8fa418',
      timestamp: 1764308232,
      signatureBase64:
        '21V9TDeXDkrCSoLGD6XrOSBNcyT5KuZNeC2u/Pkmi/Y0MuvrQ2bRTJR25uks8jgNI/Re0JY+E5NR+C+53kBODQ==',
      headerPartCount: 5,
    })
  })

  it('parses the official 4-part s:kid:ts:sig header', () => {
    expect(parseReaSignatureHeader(FOUR_PART_SAMPLE)).toEqual({
      keyId: '512bcc40-2aab-4cb7-9810-58a3dd8fa418',
      timestamp: 1764308232,
      signatureBase64:
        '21V9TDeXDkrCSoLGD6XrOSBNcyT5KuZNeC2u/Pkmi/Y0MuvrQ2bRTJR25uks8jgNI/Re0JY+E5NR+C+53kBODQ==',
      headerPartCount: 4,
    })
  })

  it('returns null for invalid header', () => {
    expect(parseReaSignatureHeader('invalid')).toBeNull()
  })
})

describe('decodeReaBase64', () => {
  it('decodes a base64url public key to 32 bytes', () => {
    const key = decodeReaBase64('53NJ5jBj5X-9PdljnPnwNqL2aCBt78wzjLpDzCHn3bo')
    expect(key.length).toBe(32)
  })

  it('matches standard base64 for the REA docs key', () => {
    const fromStd = decodeReaBase64('7ddLwGURjXv06OFw0/nLTl8YZbOlBw/wfLKYYafdGv0=')
    expect(fromStd.length).toBe(32)
    expect(fromStd.equals(Buffer.from('7ddLwGURjXv06OFw0/nLTl8YZbOlBw/wfLKYYafdGv0=', 'base64'))).toBe(
      true,
    )
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
      headerPartCount: 5,
    })
  })
})

describe('verifyReaWebhookSignature', () => {
  it('reports bad_header when the signature cannot be parsed', async () => {
    await expect(
      verifyReaWebhookSignature({
        rawBody: '{}',
        signatureHeader: 'not-a-signature',
        signingKeys: [],
      }),
    ).resolves.toEqual({
      ok: false,
      reason: 'bad_header',
      headerPartCount: 0,
    })
  })

  it('reports stale_timestamp for the expired docs sample', async () => {
    await expect(
      verifyReaWebhookSignature({
        rawBody: '{}',
        signatureHeader: FOUR_PART_SAMPLE,
        signingKeys: [],
      }),
    ).resolves.toEqual({
      ok: false,
      reason: 'stale_timestamp',
      keyId: '512bcc40-2aab-4cb7-9810-58a3dd8fa418',
      headerPartCount: 4,
    })
  })

  it('reports unknown_kid when the key is missing', async () => {
    const timestamp = Math.floor(Date.now() / 1000)
    await expect(
      verifyReaWebhookSignature({
        rawBody: '{}',
        signatureHeader: `s:missing-kid:${timestamp}:dGVzdA==`,
        signingKeys: [],
      }),
    ).resolves.toEqual({
      ok: false,
      reason: 'unknown_kid',
      keyId: 'missing-kid',
      headerPartCount: 4,
    })
  })

  it('accepts a live Ed25519 signature over timestamp+body', async () => {
    const secretKey = ed.utils.randomPrivateKey()
    const publicKey = await ed.getPublicKeyAsync(secretKey)
    const timestamp = Math.floor(Date.now() / 1000)
    const rawBody = '{"events":[]}'
    const signature = await ed.signAsync(
      Buffer.from(`${timestamp}${rawBody}`),
      secretKey,
    )
    const header = `s:live-kid:${timestamp}:${Buffer.from(signature).toString('base64url')}`

    await expect(
      verifyReaWebhookSignature({
        rawBody,
        signatureHeader: header,
        signingKeys: [
          {
            kty: 'OKP',
            use: 'sig',
            crv: 'Ed25519',
            kid: 'live-kid',
            x: Buffer.from(publicKey).toString('base64url'),
          },
        ],
      }),
    ).resolves.toEqual({
      ok: true,
      keyId: 'live-kid',
      headerPartCount: 4,
    })
  })
})
