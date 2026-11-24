/**
 * Decide what a pulled Google event does to the CRM (window pull and the
 * incremental import share this).
 */

import type { GoogleEventEntity } from '../events/types'
import { isDateOnlyValue } from '../services/calendar/event-datetime'
import { isSkedyulGoogleEventId } from '../services/calendar/event-ids'
import type { ExistingEventRow } from './crm-events'

export type EventUpsertDecision =
  /** Upsert every mapped field. */
  | { action: 'upsert' }
  /** Write only these fields (a cancellation). */
  | { action: 'cancel'; fields: Record<string, unknown> }
  | {
      action: 'skip'
      reason:
        /** Google's `updated` is not newer than the row's stored updated_at. */
        | 'not_newer'
        /** Cancelled event the CRM never had: do not create a row for it. */
        | 'unknown_cancelled'
        /** Created from Skedyul; its write-back has not landed yet. */
        | 'pending_writeback'
    }

/** Ids to read before deciding: each event, plus the series of cancelled occurrences. */
export function eventLookupIds(events: GoogleEventEntity[]): string[] {
  const ids = new Set<string>()
  for (const event of events) {
    if (event.google_event_id) ids.add(event.google_event_id)
    if (event.status === 'cancelled' && event.recurring_event_id) {
      ids.add(event.recurring_event_id)
    }
  }
  return [...ids]
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

/** Google's `updated` is not newer than what the row already stores. */
export function isNotNewer(
  googleUpdated: string | null | undefined,
  storedUpdatedAt: string | null | undefined,
): boolean {
  const incoming = parseTime(googleUpdated)
  const stored = parseTime(storedUpdatedAt)
  return incoming != null && stored != null && incoming <= stored
}

export function decideEventUpsert(
  event: GoogleEventEntity,
  existing: Map<string, ExistingEventRow>,
): EventUpsertDecision {
  const row = existing.get(event.google_event_id)

  // An in-flight local edit (pushed, write-back pending, or not yet pushed)
  // must not be reverted by an older Google copy.
  if (row && isNotNewer(event.updated_at, row.updated_at)) {
    return { action: 'skip', reason: 'not_newer' }
  }

  if (event.status === 'cancelled') {
    const marker = {
      google_event_id: event.google_event_id,
      status: 'cancelled',
      updated_at: event.updated_at,
      etag: event.etag,
    }
    if (row) {
      return { action: 'cancel', fields: marker }
    }
    // A cancelled occurrence of a series the CRM has: store it as a cancelled
    // exception so the platform hides that occurrence.
    if (
      event.recurring_event_id &&
      event.original_start &&
      existing.has(event.recurring_event_id)
    ) {
      return {
        action: 'cancel',
        fields: {
          ...marker,
          recurring_event_id: event.recurring_event_id,
          original_start: event.original_start,
          start: event.original_start,
          end: event.original_start,
          all_day: isDateOnlyValue(event.original_start),
        },
      }
    }
    return { action: 'skip', reason: 'unknown_cancelled' }
  }

  if (!row && isSkedyulGoogleEventId(event.google_event_id)) {
    return { action: 'skip', reason: 'pending_writeback' }
  }

  return { action: 'upsert' }
}
