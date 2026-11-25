import { instance } from 'skedyul'
import {
  asGoogleEventId,
  googleSeriesInstanceId,
  isSkedyulInstanceId,
} from '../services/calendar/event-datetime'
import { skedyulGoogleEventId } from '../services/calendar/event-ids'
import { readEntityString, type CrmRow } from './crm-fields'

export type SeriesGoogleId = {
  /** Google id of the series master. */
  seriesId: string
  /**
   * google: recurring_event_id already was a Google id.
   * crm: read from the master's CRM row.
   * derived: the master row has no Google id yet; this is the deterministic
   * id its create workflow inserts with (it may still be in flight).
   */
  source: 'google' | 'crm' | 'derived'
}

/**
 * Exceptions point at their series with `recurring_event_id`: the master's
 * Google id, or its CRM instance id when the master had none yet (e.g. a new
 * "this and following" series). Resolve that to the Google series id.
 * Returns null when the CRM master no longer exists.
 */
export async function resolveSeriesGoogleId(
  recurringEventId: string,
): Promise<SeriesGoogleId | null> {
  const trimmed = recurringEventId.trim()
  if (!trimmed) {
    return null
  }
  if (!isSkedyulInstanceId(trimmed)) {
    return { seriesId: trimmed, source: 'google' }
  }

  const master = (await instance.get('calendar_event', trimmed)) as CrmRow | null
  if (!master) {
    return null
  }
  const stored = asGoogleEventId(readEntityString(master, 'calendar_event', 'google_event_id'))
  if (stored) {
    return { seriesId: stored, source: 'crm' }
  }
  return { seriesId: skedyulGoogleEventId(trimmed), source: 'derived' }
}

/** `{seriesGoogleId}_{stamp}` for an exception row. */
export async function resolveSeriesInstanceId(input: {
  recurring_event_id: string
  original_start: string
  all_day?: boolean | null
}): Promise<{ instanceId: string; series: SeriesGoogleId } | null> {
  const series = await resolveSeriesGoogleId(input.recurring_event_id)
  if (!series) {
    return null
  }
  return {
    instanceId: googleSeriesInstanceId(series.seriesId, input.original_start, {
      allDay: input.all_day,
    }),
    series,
  }
}
