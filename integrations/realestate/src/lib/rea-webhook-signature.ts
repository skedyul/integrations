import { Buffer } from 'node:buffer'
import * as ed from '@noble/ed25519'
import type { ReaSigningKey } from './rea-types'

const EIGHT_HOURS_IN_SECONDS = 8 * 60 * 60

interface SigningKeyCacheEntry {
  keys: Map<string, ReaSigningKey>
  fetchedAtMs: number
}

let signingKeyCache: SigningKeyCacheEntry | null = null
const SIGNING_KEY_CACHE_TTL_MS = 60 * 60 * 1000

export function resetSigningKeyCache(): void {
  signingKeyCache = null
}

export function cacheSigningKeys(keys: ReaSigningKey[]): void {
  signingKeyCache = {
    keys: new Map(keys.map((key) => [key.kid, key])),
    fetchedAtMs: Date.now(),
  }
}

export function getCachedSigningKey(kid: string): ReaSigningKey | undefined {
  return signingKeyCache?.keys.get(kid)
}

export function getCachedSigningKeys(): ReaSigningKey[] {
  if (!signingKeyCache) {
    return []
  }
  return Array.from(signingKeyCache.keys.values())
}

export function isSigningKeyCacheStale(): boolean {
  if (!signingKeyCache) {
    return true
  }
  return Date.now() - signingKeyCache.fetchedAtMs > SIGNING_KEY_CACHE_TTL_MS
}

export interface ParsedReaSignature {
  keyId: string
  timestamp: number
  signatureBase64: string
  headerPartCount: number
}

/**
 * Decode REA Base64 or Base64URL (`-`/`_`, optional padding).
 */
export function decodeReaBase64(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  return Buffer.from(normalized + '='.repeat(padLength), 'base64')
}

/**
 * Official form: `s:{keyId}:{timestamp}:{signature}` (4 parts).
 * REA docs sample also uses a duplicate timestamp: `s:kid:ts:ts:sig` (5 parts).
 */
export function parseReaSignatureHeader(
  header: string | undefined,
): ParsedReaSignature | null {
  if (!header?.startsWith('s:')) {
    return null
  }

  const parts = header.split(':')
  if (parts.length < 4) {
    return null
  }

  const keyId = parts[1]
  const timestampStr = parts[2]
  const signatureBase64 = parts.length === 4 ? parts[3] : parts[parts.length - 1]
  if (!keyId || !timestampStr || !signatureBase64) {
    return null
  }

  const timestamp = parseInt(timestampStr, 10)
  if (Number.isNaN(timestamp)) {
    return null
  }

  return {
    keyId,
    timestamp,
    signatureBase64,
    headerPartCount: parts.length,
  }
}

export function isSignatureTimestampValid(timestamp: number, nowSeconds?: number): boolean {
  const currentEpochTimeInSeconds = nowSeconds ?? Math.floor(Date.now() / 1000)
  return timestamp + EIGHT_HOURS_IN_SECONDS >= currentEpochTimeInSeconds
}

export type ReaSignatureVerifyFailure =
  | 'bad_header'
  | 'stale_timestamp'
  | 'unknown_kid'
  | 'verify_failed'

export type ReaSignatureVerifyResult =
  | { ok: true; keyId: string; headerPartCount: number }
  | {
      ok: false
      reason: ReaSignatureVerifyFailure
      keyId?: string
      headerPartCount?: number
    }

export async function verifyReaWebhookSignature(params: {
  rawBody: string
  signatureHeader: string | undefined
  signingKeys: ReaSigningKey[]
}): Promise<ReaSignatureVerifyResult> {
  const parsed = parseReaSignatureHeader(params.signatureHeader)
  if (!parsed) {
    return {
      ok: false,
      reason: 'bad_header',
      headerPartCount: params.signatureHeader?.startsWith('s:')
        ? params.signatureHeader.split(':').length
        : 0,
    }
  }

  if (!isSignatureTimestampValid(parsed.timestamp)) {
    return {
      ok: false,
      reason: 'stale_timestamp',
      keyId: parsed.keyId,
      headerPartCount: parsed.headerPartCount,
    }
  }

  const keyEntry =
    params.signingKeys.find((key) => key.kid === parsed.keyId) ??
    getCachedSigningKey(parsed.keyId)

  if (!keyEntry) {
    return {
      ok: false,
      reason: 'unknown_kid',
      keyId: parsed.keyId,
      headerPartCount: parsed.headerPartCount,
    }
  }

  try {
    const signature = decodeReaBase64(parsed.signatureBase64)
    const publicKey = decodeReaBase64(keyEntry.x)
    const messageBytes = Buffer.from(`${parsed.timestamp}${params.rawBody}`)
    const isValid = await ed.verifyAsync(signature, messageBytes, publicKey)
    if (!isValid) {
      return {
        ok: false,
        reason: 'verify_failed',
        keyId: parsed.keyId,
        headerPartCount: parsed.headerPartCount,
      }
    }
    return {
      ok: true,
      keyId: parsed.keyId,
      headerPartCount: parsed.headerPartCount,
    }
  } catch {
    return {
      ok: false,
      reason: 'verify_failed',
      keyId: parsed.keyId,
      headerPartCount: parsed.headerPartCount,
    }
  }
}
