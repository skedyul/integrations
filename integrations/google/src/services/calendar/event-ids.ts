import { createHash } from 'node:crypto'

/**
 * Deterministic Google event ids for events created in Skedyul.
 *
 * Google client-supplied ids may only use base32hex characters (lowercase
 * a–v and 0–9) and must be 5–1024 characters long. `sk` + a sha256 hex digest
 * of the CRM instance id satisfies that, so a retried insert for the same CRM
 * row targets the same Google id (409 instead of a duplicate event).
 */
const SKEDYUL_EVENT_ID_PREFIX = 'sk'

const SKEDYUL_MASTER_ID = /^sk[0-9a-f]{64}$/
const SKEDYUL_ORIGINATED_ID = /^sk[0-9a-f]{64}(?:_.+)?$/

export function skedyulGoogleEventId(crmInstanceId: string): string {
  const trimmed = crmInstanceId.trim()
  if (!trimmed) {
    throw new Error('A CRM instance id is required to derive a Google event id')
  }
  return `${SKEDYUL_EVENT_ID_PREFIX}${createHash('sha256').update(trimmed).digest('hex')}`
}

/** True for the exact id `skedyulGoogleEventId` produces (a series master or single event). */
export function isSkedyulGoogleEventId(eventId: string | null | undefined): boolean {
  return typeof eventId === 'string' && SKEDYUL_MASTER_ID.test(eventId)
}

/** Skedyul-created event or an instance (`{id}_{stamp}`) of a Skedyul-created series. */
export function isSkedyulOriginatedGoogleEventId(eventId: string | null | undefined): boolean {
  return typeof eventId === 'string' && SKEDYUL_ORIGINATED_ID.test(eventId)
}

/** Google event ids: base32hex plus `_` for recurring instances. */
export function isValidGoogleClientEventId(eventId: string): boolean {
  return /^[a-v0-9]{5,1024}$/.test(eventId)
}
